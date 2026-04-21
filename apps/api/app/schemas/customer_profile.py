import uuid

from pydantic import BaseModel, Field, field_validator

from app.models.customer_profile import PetType

_HOME_TYPES = {"house", "apartment", "condo", "other"}


class CustomerProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    home_description: str | None
    home_type: str | None
    has_yard: bool
    pet_names: list[str]
    pet_types: list[str]
    pet_description: str | None
    special_instructions: str | None

    model_config = {"from_attributes": True}


class CustomerProfileUpdateRequest(BaseModel):
    home_description: str | None = Field(default=None, max_length=2000)
    home_type: str | None = None
    has_yard: bool | None = None
    pet_names: list[str] | None = None
    pet_types: list[str] | None = None
    pet_description: str | None = Field(default=None, max_length=2000)
    special_instructions: str | None = Field(default=None, max_length=1000)

    @field_validator("home_type")
    @classmethod
    def validate_home_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        lowered = value.lower()
        if lowered not in _HOME_TYPES:
            raise ValueError("home_type must be one of: house, apartment, condo, other")
        return lowered

    @field_validator("pet_types")
    @classmethod
    def validate_pet_types(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        valid_values = {pet_type.value for pet_type in PetType}
        result = []
        for item in value:
            uppercased = item.upper()
            if uppercased not in valid_values:
                raise ValueError(f"Invalid pet type: {item}")
            result.append(uppercased)
        return result
