from app.config.settings import get_settings
from prisma import Prisma
from typing import Optional


__prisma_client: Optional[Prisma] = None


async def get_prisma_client() -> Prisma:
    global __prisma_client
    if __prisma_client is None:
        __prisma_client = Prisma(
            datasource = {
                "url": get_settings().database_url
            }
        )
        await __prisma_client.connect()

    return __prisma_client

async def close_prisma_client() -> None:
    global __prisma_client
    if __prisma_client is not None:
        await __prisma_client.disconnect()
        __prisma_client = None


    