import asyncio
import sys
from pathlib import Path
from sqlmodel import select
from sqlalchemy.exc import DatabaseError


if __package__ is None or __package__ == "":
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

from src.auth.models import User, Role
from src.db.main import async_session_maker
from src.utils.auth import generate_password_hash


INVESTOR_EMAIL_PASSWORDS = {
    "investor01@agriflow.com": "Investor01!Pass",
    "investor02@agriflow.com": "Investor02!Pass",
    "investor03@agriflow.com": "Investor03!Pass",
}


FIRST_NAMES = ["Ibrahim", "Nneka", "Tola"]
LAST_NAMES = ["Balewa", "Okeke", "Adewale"]
IS_ACTIVE_FLAGS = [True, True, True]


async def seed_investors() -> None:
    new_investors: list[User] = []

    async with async_session_maker() as session:
        for idx, (email, plain_password) in enumerate(INVESTOR_EMAIL_PASSWORDS.items(), start=1):
            existing_statement = select(User).where(User.email == email)
            existing_result = await session.exec(existing_statement)
            existing_investor = existing_result.first()

            if existing_investor:
                continue

            investor = User(
                first_name=FIRST_NAMES[idx - 1],
                last_name=LAST_NAMES[idx - 1],
                email=email,
                password_hash=generate_password_hash(plain_password),
                role=Role.INVESTOR,
                is_active=IS_ACTIVE_FLAGS[idx - 1],
            )
            new_investors.append(investor)

        if not new_investors:
            print("No new investors added. Seed emails already exist.")
            return

        try:
            session.add_all(new_investors)
            await session.commit()
            print(f"Successfully seeded {len(new_investors)} investors.")
            print("Use INVESTOR_EMAIL_PASSWORDS in this file for investor login testing.")
        except DatabaseError as exc:
            await session.rollback()
            print(f"Failed to seed investors: {exc}")


if __name__ == "__main__":
    asyncio.run(seed_investors())