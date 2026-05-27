from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_anon_key: str | None = None
    supabase_table: str = 'exam_analyses'

    auth_required: bool = False
    guest_user_email: str = 'guest@aidoc.local'
    guest_user_password: str = 'AIDocGuest#2026'
    guest_user_name: str = 'AIDoc Guest'

    ai_provider: str = 'mock'
    ai_model: str = 'aidoc-mock-v1'
    ai_api_key: str | None = None
    ai_base_url: str | None = None

    app_host: str = '0.0.0.0'
    app_port: int = 8000
    max_history_items: int = 20


settings = Settings()
