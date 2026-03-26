import asyncio
import sys
from pathlib import Path
from sqlmodel import select
from sqlalchemy.exc import DatabaseError


if __package__ is None or __package__ == "":
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

from src.auth.models import Admin
from src.db.main import async_session_maker
from src.utils.auth import generate_password_hash


ADMIN_EMAIL_PASSWORDS = {
    "admin01@agriflow.com": "Admin01!Pass",
    "admin02@agriflow.com": "Admin02!Pass",
    "admin03@agriflow.com": "Admin03!Pass",
}


FIRST_NAMES = ["Grace", "Musa", "Chioma"]
LAST_NAMES = ["Ogunleye", "Sani", "Eze"]
IS_ACTIVE_FLAGS = [True, True, True]


async def seed_admins() -> None:
    new_admins: list[Admin] = []

    async with async_session_maker() as session:
        for idx, (email, plain_password) in enumerate(ADMIN_EMAIL_PASSWORDS.items(), start=1):
            existing_statement = select(Admin).where(Admin.email == email)
            existing_result = await session.exec(existing_statement)
            existing_admin = existing_result.first()

            if existing_admin:
                continue

            admin = Admin(
                first_name=FIRST_NAMES[idx - 1],
                last_name=LAST_NAMES[idx - 1],
                email=email,
                password_hash=generate_password_hash(plain_password),
                is_active=IS_ACTIVE_FLAGS[idx - 1],
            )
            new_admins.append(admin)

        if not new_admins:
            print("No new admins added. Seed emails already exist.")
            return

        try:
            session.add_all(new_admins)
            await session.commit()
            print(f"Successfully seeded {len(new_admins)} admins.")
            print("Use ADMIN_EMAIL_PASSWORDS in this file for admin login testing.")
        except DatabaseError as exc:
            await session.rollback()
            print(f"Failed to seed admins: {exc}")


if __name__ == "__main__":
    asyncio.run(seed_admins())
