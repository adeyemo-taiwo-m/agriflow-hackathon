from fastapi import FastAPI, Request, HTTPException, status
from contextlib import asynccontextmanager
from src.db.main import init_db
from fastapi.middleware.cors import CORSMiddleware
from src.utils.logger import logger
from src.auth.routes import auth_router
from src.bank.routes import bank_router
from src.farmers.routes import farmer_router
from src.investors.routes import investor_router
from src.crops.routes import crop_router
from src.farms.routes import farm_router
from src.admin.routes import admin_router
from src.milestones.routes import milestone_router
from src.investments.routes import investment_router
from src.harvest.routes import harvest_router

# Resolve Pydantic v2 forward references after all models are imported.
# String annotations (e.g. List['Farm']) prevent circular ImportErrors at
# module load time, but Pydantic still needs model_rebuild() to finalize
# the serializer so model_dump() and response_model validation work correctly.
from src.farms.models import Farm
from src.auth.models import User
Farm.model_rebuild()
User.model_rebuild()

from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from src.db.redis import redis_client, check_redis_connection
from src.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize Postgres
    await init_db()
    
    # 2. Check Redis Connection
    await check_redis_connection()

    yield
    
    # 3. Clean up Redis connections on shutdown
    logger.info("Closing Redis Connection")
    if redis_client:
        await redis_client.close()
    logger.info("Server Closed")



logger.info("server starting")
app = FastAPI(
    title="API for Agriflow",
    description="Documentation of agriflow api",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "https://agriflow-hackathon.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return "server working"


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc:HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content = {
            "success": False,
            "message": exc.detail,
            "data": None
        }
    )

def format_validation_errors(errors):
    formatted = []
    for err in errors:
        loc = err["loc"]
        field = ".".join(str(l) for l in loc[1:]) if len(loc) > 1 else str(loc[0])
        formatted.append({
            "field": field,
            "message": err["msg"]
        })
    return formatted

@app.exception_handler(RequestValidationError)
async def custom_validation_exception_handler(request:Request, exc: RequestValidationError):
    logger.error(f"validation error", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "success": False,
            "message": "Validation error",
            "errors": format_validation_errors(exc.errors()),
            "data": None
        }
    )


app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(bank_router, prefix="/api/v1/banks", tags=["Banks"])
app.include_router(farmer_router, prefix="/api/v1/farmers", tags=["farmers"])
app.include_router(investor_router, prefix="/api/v1/investors", tags=["investors"])
app.include_router(crop_router, prefix="/api/v1/crops", tags=["crops"])
app.include_router(farm_router, prefix="/api/v1/farms", tags=["farms"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(milestone_router, prefix="/api/v1/milestones", tags=["milestones"])
app.include_router(investment_router, prefix="/api/v1/investments", tags=["investments"])
app.include_router(harvest_router, prefix="/api/v1/harvest", tags=["Harvest"])