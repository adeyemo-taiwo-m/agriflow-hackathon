from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    IS_PRODUCTION: bool
    
    DATABASE_URL: str
    REDIS_URL: str
    JWT_KEY: str
    JWT_ALGORITHM: str


    INTERSWITCH_MARKETPLACE_CLIENT_ID: str
    INTERSWITCH_MARKETPLACE_SECRET_KEY: str
    INTERSWITCH_MARKETPLACE_TOKEN_URL: str
    INTERSWITCH_MARKETPLACE_BASE_URL: str

    # INTERSWITCH_CLIENT_ID: str
    # INTERSWITCH_SECRET_KEY:str
    INTERSWITCH_MERCHANT_CODE:str
    INTERSWITCH_PAY_ITEM_ID:str
    INTERSWITCH_BASE_URL:str

    BETTER_STACK_SOURCE_TOKEN: str
    BETTER_STACK_INGESTING_HOST: str

    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET:str


    model_config = SettingsConfigDict(
        env_file =".env",
        extra = "ignore"
    )

Config = Settings()