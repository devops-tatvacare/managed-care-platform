#!/usr/bin/env python3
import os
import re
import sys
import time
import ssl
import errno
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from collections import deque


IMG_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".webp", ".avif", ".bmp"}
CSS_EXTS = {".css"}


def ensure_dir(path: str):
    if not path:
        return
    try:
        os.makedirs(path, exist_ok=True)
    except OSError as e:
        if e.errno != errno.EEXIST:
            raise


def read_url(url: str, ua: str, timeout: int = 20):
    ctx = ssl.create_default_context()
    # Be forgiving if the site has certificate issues (like wget --no-check-certificate)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = Request(url, headers={"User-Agent": ua})
    with urlopen(req, timeout=timeout, context=ctx) as resp:
        content_type = resp.headers.get("Content-Type", "")
        data = resp.read()
    return data, content_type


def is_same_site(url: str, allowed_netloc: str):
    return urlparse(url).netloc == allowed_netloc


def has_ext(url: str, exts):
    path = urlparse(url).path
    _, ext = os.path.splitext(path.lower())
    return ext in exts


def extract_links(html: str, base_url: str):
    # Very lightweight extraction without external deps
    links = set()
    imgs = set()
    css_links = set()
    script_links = set()

    # img src and source srcset
    for m in re.finditer(r"<img[^>]+src=[\'\"]([^\'\"]+)[\'\"]", html, re.IGNORECASE):
        imgs.add(urljoin(base_url, m.group(1)))

    for m in re.finditer(r"<source[^>]+srcset=[\'\"]([^\'\"]+)[\'\"]", html, re.IGNORECASE):
        srcset = m.group(1)
        for part in srcset.split(','):
            url = part.strip().split()[0]
            if url:
                imgs.add(urljoin(base_url, url))

    # link rel icons and stylesheets
    for m in re.finditer(r"<link[^>]+rel=[\'\"]([^\'\"]+)[\'\"][^>]*href=[\'\"]([^\'\"]+)[\'\"]", html, re.IGNORECASE):
        rel = m.group(1).lower()
        href = urljoin(base_url, m.group(2))
        if any(t in rel for t in ["icon", "apple-touch-icon", "mask-icon"]):
            imgs.add(href)
        if "stylesheet" in rel:
            css_links.add(href)

    # meta og:image / twitter:image
    for m in re.finditer(r"<meta[^>]+property=[\'\"](og:image|twitter:image)[\'\"][^>]*content=[\'\"]([^\'\"]+)[\'\"]", html, re.IGNORECASE):
        imgs.add(urljoin(base_url, m.group(2)))

    # background images from inline style attributes
    for m in re.finditer(r"style=[\'\"][^\'\"]+[\'\"]", html, re.IGNORECASE):
        style = m.group(0)
        for u in re.findall(r"url\(([^)]+)\)", style):
            u = u.strip('\"\' )')
            if u and not u.startswith('data:'):
                imgs.add(urljoin(base_url, u))

    # anchor links to crawl further
    for m in re.finditer(r"<a[^>]+href=[\'\"]([^\'\"]+)[\'\"]", html, re.IGNORECASE):
        href = m.group(1)
        if href:
            links.add(urljoin(base_url, href))

    # script src (to later scan for asset references)
    for m in re.finditer(r"<script[^>]+src=[\'\"]([^\'\"]+)[\'\"]", html, re.IGNORECASE):
        script_links.add(urljoin(base_url, m.group(1)))

    # inline <style> blocks
    for m in re.finditer(r"<style[^>]*>(.*?)</style>", html, re.IGNORECASE | re.DOTALL):
        for u in re.findall(r"url\(([^)]+)\)", m.group(1)):
            u = u.strip('\"\' )')
            if u and not u.startswith('data:'):
                imgs.add(urljoin(base_url, u))

    return links, imgs, css_links, script_links


def extract_images_from_css(css_text: str, base_url: str):
    imgs = set()
    for u in re.findall(r"url\(([^)]+)\)", css_text):
        u = u.strip('\"\' )')
        if u and not u.startswith('data:'):
            imgs.add(urljoin(base_url, u))
    return imgs


def save_binary(url: str, out_root: str, ua: str):
    # Map URL path to local file path under out_root
    parsed = urlparse(url)
    path = parsed.path
    if not path or path.endswith('/'):
        # If URL is like / or /dir/, skip; not a file
        return False
    local_path = os.path.join(out_root, parsed.netloc, path.lstrip('/'))
    ensure_dir(os.path.dirname(local_path))
    try:
        data, _ = read_url(url, ua)
    except Exception as e:
        # print error but continue
        sys.stderr.write(f"Failed to download {url}: {e}\n")
        return False
    with open(local_path, 'wb') as f:
        f.write(data)
    return True


def crawl_and_download(start_url: str, out_dir: str, max_depth: int = 2, delay: float = 0.2):
    ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
    parsed_start = urlparse(start_url)
    base_netloc = parsed_start.netloc
    visited_pages = set()
    to_visit = deque([(start_url, 0)])
    seen_imgs = set()
    downloaded = 0

    ensure_dir(out_dir)

    # Try to seed from sitemap.xml if present
    base_root = f"{parsed_start.scheme}://{parsed_start.netloc}"
    sitemap_url = urljoin(base_root + '/', 'sitemap.xml')
    try:
        sm_data, sm_ctype = read_url(sitemap_url, ua)
        sm_text = sm_data.decode('utf-8', errors='ignore')
        for m in re.finditer(r"<loc>\s*([^<]+?)\s*</loc>", sm_text, re.IGNORECASE):
            loc = m.group(1).strip()
            if is_same_site(loc, base_netloc):
                to_visit.append((loc, 0))
    except Exception:
        pass

    while to_visit:
        url, depth = to_visit.popleft()
        if url in visited_pages:
            continue
        visited_pages.add(url)

        # Only crawl HTML pages on same site
        if urlparse(url).netloc and urlparse(url).netloc != base_netloc:
            continue
        try:
            data, ctype = read_url(url, ua)
        except Exception as e:
            sys.stderr.write(f"Failed to fetch page {url}: {e}\n")
            continue

        # Process HTML only
        ctype_lower = (ctype or '').lower()
        if 'text/html' not in ctype_lower and not url.endswith(('/', '.html', '.htm')):
            # If it's CSS, handle separately below by enqueueing images
            pass

        html = data.decode('utf-8', errors='ignore')
        links, imgs, css_links, script_links = extract_links(html, url)

        # Queue next pages within same site
        if depth < max_depth:
            for link in links:
                if link.startswith('mailto:') or link.startswith('tel:'):
                    continue
                if urlparse(link).fragment:
                    # strip fragment to avoid dupes
                    link = link.split('#', 1)[0]
                if is_same_site(link, base_netloc):
                    to_visit.append((link, depth + 1))

        # Collect images from HTML
        for img in imgs:
            if has_ext(img, IMG_EXTS):
                seen_imgs.add(img)

        # Parse CSS files for images
        for css_url in css_links:
            try:
                css_data, css_ctype = read_url(css_url, ua)
            except Exception as e:
                sys.stderr.write(f"Failed to fetch CSS {css_url}: {e}\n")
                continue
            css_text = css_data.decode('utf-8', errors='ignore')
            for img in extract_images_from_css(css_text, css_url):
                if has_ext(img, IMG_EXTS):
                    seen_imgs.add(img)

        # Fetch script files and scan for image-like paths
        for js_url in script_links:
            try:
                js_data, js_ctype = read_url(js_url, ua)
            except Exception as e:
                sys.stderr.write(f"Failed to fetch JS {js_url}: {e}\n")
                continue
            js_text = js_data.decode('utf-8', errors='ignore')
            # Look for strings ending with image extensions, absolute or root-relative
            for m in re.finditer(r"[\'\"](https?://[^\'\"]+?|/[^\'\"]+?)(?:\.(?:jpg|jpeg|png|gif|svg|ico|webp|avif|bmp))(?:\?[^\'\"]*)?[\'\"]", js_text, re.IGNORECASE):
                ref = m.group(0).strip('\"\'')
                # m.group(0) includes the quotes and extension; rebuild via group(1) plus ext
                ref = m.group(1) + js_text[m.end(1):m.end(0)-1]  # include the extension and query
                img_url = urljoin(js_url, ref)
                if has_ext(img_url, IMG_EXTS):
                    seen_imgs.add(img_url)

        # Attempt to read manifest.json for icons
        try:
            manifest_url = urljoin(base_root + '/', 'manifest.json')
            man_data, _ = read_url(manifest_url, ua)
            man_text = man_data.decode('utf-8', errors='ignore')
            # crude JSON-free parse of icons src values
            for m in re.finditer(r"\"src\"\s*:\s*\"([^\"]+)\"", man_text):
                icon_url = urljoin(manifest_url, m.group(1))
                if has_ext(icon_url, IMG_EXTS):
                    seen_imgs.add(icon_url)
        except Exception:
            pass

        # Throttle a bit
        time.sleep(delay)

    # Download images
    for img_url in sorted(seen_imgs):
        ok = save_binary(img_url, out_dir, ua)
        if ok:
            downloaded += 1

    return downloaded, len(visited_pages), len(seen_imgs)


def main():
    if len(sys.argv) < 3:
        print("Usage: download_images.py <start_url> <output_dir> [max_depth]", file=sys.stderr)
        sys.exit(2)
    start_url = sys.argv[1]
    out_dir = sys.argv[2]
    max_depth = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    downloaded, pages, found = crawl_and_download(start_url, out_dir, max_depth=max_depth)
    print(f"Pages crawled: {pages}; Images found: {found}; Images downloaded: {downloaded}")


if __name__ == "__main__":
    main()
