from typing import Optional

from pydantic import BaseModel


class CollectionResponse(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    button_text: Optional[str] = None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class CollectionCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    button_text: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CollectionUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    button_text: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryImageUpdate(BaseModel):
    image_url: Optional[str] = None
