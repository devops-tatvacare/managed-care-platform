from pydantic import BaseModel


class PathwayBlockSchema(BaseModel):
    id: str
    block_type: str
    category: str
    label: str
    config: dict
    position: dict | None = None
    order_index: int = 0


class PathwayEdgeSchema(BaseModel):
    id: str
    source_block_id: str
    target_block_id: str
    edge_type: str = "default"
    label: str | None = None


class PathwayListItem(BaseModel):
    id: str
    name: str
    description: str | None
    condition: str | None
    target_tiers: list[int]
    status: str
    version: int
    block_count: int = 0
    created_at: str
    updated_at: str


class PathwayDetail(PathwayListItem):
    created_by: str
    published_at: str | None
    published_by: str | None
    blocks: list[PathwayBlockSchema]
    edges: list[PathwayEdgeSchema]


class PathwayCreate(BaseModel):
    name: str
    description: str | None = None
    condition: str | None = None
    target_tiers: list[int] = []


class PathwayUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    condition: str | None = None
    target_tiers: list[int] | None = None
    status: str | None = None


class BlockCreate(BaseModel):
    block_type: str
    category: str
    label: str
    config: dict = {}
    position: dict | None = None
    order_index: int = 0


class BlockUpdate(BaseModel):
    label: str | None = None
    config: dict | None = None
    position: dict | None = None
    order_index: int | None = None


class PathwayListResponse(BaseModel):
    items: list[PathwayListItem]
    total: int


class PathwayGenerateRequest(BaseModel):
    prompt: str
    pathway_id: str | None = None


class AISessionListItem(BaseModel):
    id: str
    title: str
    pathway_id: str | None
    message_count: int
    created_at: str
    updated_at: str


class AISessionDetail(AISessionListItem):
    messages: list[dict]
    generated_pathway: dict | None


class AISessionCreate(BaseModel):
    title: str = "New Chat"


class AISessionUpdate(BaseModel):
    title: str | None = None
    messages: list[dict] | None = None
    generated_pathway: dict | None = None
    pathway_id: str | None = None
