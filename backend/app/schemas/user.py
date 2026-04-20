from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AddressCreate(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str
    country: str = "US"
    is_default: bool = False


class AddressResponse(BaseModel):
    id: int
    street: str
    city: str
    state: str
    zip_code: str
    country: str
    is_default: bool

    model_config = {"from_attributes": True}
