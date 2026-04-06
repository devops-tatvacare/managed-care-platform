from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int
