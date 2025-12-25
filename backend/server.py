from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import re
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'commuteshare')]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'commuteshare-secret-key-2025')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Security
security = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI(title="CommuteShare API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Auth Models
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str
    nin: Optional[str] = None
    university_name: Optional[str] = None
    
    @validator('email')
    def validate_email(cls, v):
        # Check for university email pattern or valid email
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str
    university_name: Optional[str] = None
    is_verified: bool = False
    wallet_balance: float = 0.0
    loyalty_points: int = 0
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Wallet Models
class WalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    transaction_type: str  # deposit, withdrawal, purchase, sale, refund
    description: str
    status: str = "completed"  # pending, completed, failed
    reference: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DepositRequest(BaseModel):
    amount: float
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class WithdrawalRequest(BaseModel):
    amount: float
    bank_name: str
    account_number: str
    account_name: str
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

# Product Models
class ProductCreate(BaseModel):
    title: str
    description: str
    price: float
    category: str  # electronics, fashion, books, furniture, food, services
    subcategory: Optional[str] = None
    condition: str = "new"  # new, like_new, good, fair
    images: List[str] = []  # base64 encoded images
    location: Optional[str] = None
    quantity: int = 1

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str
    seller_name: str
    title: str
    description: str
    price: float
    category: str
    subcategory: Optional[str] = None
    condition: str = "new"
    images: List[str] = []
    location: Optional[str] = None
    quantity: int = 1
    is_available: bool = True
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Order Models
class OrderCreate(BaseModel):
    product_id: str
    quantity: int = 1
    delivery_address: Optional[str] = None
    notes: Optional[str] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyer_id: str
    buyer_name: str
    seller_id: str
    seller_name: str
    product_id: str
    product_title: str
    product_image: Optional[str] = None
    quantity: int
    unit_price: float
    total_amount: float
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"  # pending, confirmed, in_transit, delivered, cancelled, refunded
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Service Models (for makeup, photography, project writing, etc.)
class ServiceCreate(BaseModel):
    title: str
    description: str
    price: float
    service_type: str  # makeup, photography, project_writing, topic_verification, tutoring, other
    duration: Optional[str] = None  # e.g., "2 hours", "1 day"
    images: List[str] = []
    location: Optional[str] = None
    availability: Optional[str] = None

class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider_id: str
    provider_name: str
    title: str
    description: str
    price: float
    service_type: str
    duration: Optional[str] = None
    images: List[str] = []
    location: Optional[str] = None
    availability: Optional[str] = None
    rating: float = 0.0
    total_reviews: int = 0
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Service Booking
class ServiceBookingCreate(BaseModel):
    service_id: str
    scheduled_date: str  # ISO date string
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    location: Optional[str] = None

class ServiceBooking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_id: str
    service_title: str
    client_id: str
    client_name: str
    provider_id: str
    provider_name: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    amount: float
    status: str = "pending"  # pending, confirmed, in_progress, completed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Restaurant & Food Models
class RestaurantCreate(BaseModel):
    name: str
    description: str
    cuisine_type: str
    address: str
    phone: str
    opening_hours: Optional[str] = None
    image: Optional[str] = None

class Restaurant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    name: str
    description: str
    cuisine_type: str
    address: str
    phone: str
    opening_hours: Optional[str] = None
    image: Optional[str] = None
    rating: float = 0.0
    total_reviews: int = 0
    is_open: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    restaurant_id: str
    name: str
    description: str
    price: float
    category: str  # appetizer, main, dessert, drinks
    image: Optional[str] = None
    is_available: bool = True

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    description: str
    price: float
    category: str
    image: Optional[str] = None
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FoodOrderCreate(BaseModel):
    restaurant_id: str
    items: List[Dict[str, Any]]  # [{menu_item_id, quantity}]
    delivery_address: str
    notes: Optional[str] = None

class FoodOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    restaurant_id: str
    restaurant_name: str
    items: List[Dict[str, Any]]
    subtotal: float
    delivery_fee: float = 200.0
    total_amount: float
    delivery_address: str
    notes: Optional[str] = None
    status: str = "pending"  # pending, confirmed, preparing, ready, in_transit, delivered, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Review Model
class ReviewCreate(BaseModel):
    target_id: str  # product_id, service_id, or restaurant_id
    target_type: str  # product, service, restaurant
    rating: int  # 1-5
    comment: Optional[str] = None

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    target_id: str
    target_type: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "exp": expiration,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "full_name": data.full_name,
        "phone": data.phone,
        "nin": data.nin,
        "university_name": data.university_name,
        "is_verified": False,
        "wallet_balance": 0.0,
        "loyalty_points": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            phone=user["phone"],
            university_name=user.get("university_name"),
            is_verified=user["is_verified"],
            wallet_balance=user["wallet_balance"],
            loyalty_points=user["loyalty_points"],
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            phone=user["phone"],
            university_name=user.get("university_name"),
            is_verified=user.get("is_verified", False),
            wallet_balance=user.get("wallet_balance", 0.0),
            loyalty_points=user.get("loyalty_points", 0),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        phone=user["phone"],
        university_name=user.get("university_name"),
        is_verified=user.get("is_verified", False),
        wallet_balance=user.get("wallet_balance", 0.0),
        loyalty_points=user.get("loyalty_points", 0),
        created_at=user["created_at"]
    )

# ==================== WALLET ROUTES ====================

@api_router.get("/wallet/balance")
async def get_wallet_balance(user: dict = Depends(get_current_user)):
    return {
        "balance": user.get("wallet_balance", 0.0),
        "loyalty_points": user.get("loyalty_points", 0)
    }

@api_router.post("/wallet/deposit")
async def deposit_funds(data: DepositRequest, user: dict = Depends(get_current_user)):
    # Mock Paystack deposit - In production, integrate with Paystack
    new_balance = user.get("wallet_balance", 0.0) + data.amount
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"wallet_balance": new_balance}}
    )
    
    # Record transaction
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=data.amount,
        transaction_type="deposit",
        description=f"Wallet deposit of ₦{data.amount:,.2f}",
        reference=f"DEP-{uuid.uuid4().hex[:8].upper()}"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {
        "message": "Deposit successful (Mock)",
        "new_balance": new_balance,
        "reference": transaction.reference
    }

@api_router.post("/wallet/withdraw")
async def withdraw_funds(data: WithdrawalRequest, user: dict = Depends(get_current_user)):
    current_balance = user.get("wallet_balance", 0.0)
    
    if data.amount > current_balance:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Verify bank account name matches user name (anti-fraud)
    # In production, use Paystack's account verification API
    user_name_parts = user["full_name"].lower().split()
    account_name_parts = data.account_name.lower().split()
    
    # Check if at least surname matches
    name_match = any(part in account_name_parts for part in user_name_parts)
    if not name_match:
        raise HTTPException(
            status_code=400, 
            detail="Bank account name must match your registered name for security"
        )
    
    new_balance = current_balance - data.amount
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"wallet_balance": new_balance}}
    )
    
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=data.amount,
        transaction_type="withdrawal",
        description=f"Withdrawal to {data.bank_name} - {data.account_number}",
        reference=f"WTH-{uuid.uuid4().hex[:8].upper()}"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {
        "message": "Withdrawal request submitted (Mock - funds will be transferred)",
        "new_balance": new_balance,
        "reference": transaction.reference
    }

@api_router.get("/wallet/transactions")
async def get_transactions(user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    return transactions

# ==================== MARKETPLACE ROUTES ====================

@api_router.post("/products", response_model=Product)
async def create_product(data: ProductCreate, user: dict = Depends(get_current_user)):
    product = Product(
        seller_id=user["id"],
        seller_name=user["full_name"],
        **data.dict()
    )
    await db.products.insert_one(product.dict())
    return product

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 50
):
    query = {"is_available": True}
    
    if category:
        query["category"] = category
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query).sort("created_at", -1).to_list(limit)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Increment views
    await db.products.update_one(
        {"id": product_id},
        {"$inc": {"views": 1}}
    )
    
    return product

@api_router.get("/my-products")
async def get_my_products(user: dict = Depends(get_current_user)):
    products = await db.products.find(
        {"seller_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    return products

@api_router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    data: ProductCreate,
    user: dict = Depends(get_current_user)
):
    product = await db.products.find_one({"id": product_id, "seller_id": user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = data.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    return {"message": "Product updated"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id, "seller_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== ORDERS ROUTES ====================

@api_router.post("/orders", response_model=Order)
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": data.product_id, "is_available": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or unavailable")
    
    if product["quantity"] < data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    if product["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot buy your own product")
    
    total_amount = product["price"] * data.quantity
    
    # Check wallet balance
    if user.get("wallet_balance", 0.0) < total_amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    
    # Deduct from buyer wallet
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_balance": -total_amount}}
    )
    
    # Create order
    order = Order(
        buyer_id=user["id"],
        buyer_name=user["full_name"],
        seller_id=product["seller_id"],
        seller_name=product["seller_name"],
        product_id=product["id"],
        product_title=product["title"],
        product_image=product["images"][0] if product.get("images") else None,
        quantity=data.quantity,
        unit_price=product["price"],
        total_amount=total_amount,
        delivery_address=data.delivery_address,
        notes=data.notes
    )
    
    await db.orders.insert_one(order.dict())
    
    # Update product quantity
    new_qty = product["quantity"] - data.quantity
    await db.products.update_one(
        {"id": product["id"]},
        {"$set": {
            "quantity": new_qty,
            "is_available": new_qty > 0
        }}
    )
    
    # Record transaction
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=total_amount,
        transaction_type="purchase",
        description=f"Purchase: {product['title']}",
        reference=f"ORD-{order.id[:8].upper()}"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return order

@api_router.get("/orders")
async def get_my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"buyer_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/sales")
async def get_my_sales(user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"seller_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    return orders

@api_router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: str,
    user: dict = Depends(get_current_user)
):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only seller can update most statuses, buyer can confirm delivery
    if order["seller_id"] != user["id"] and order["buyer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    valid_statuses = ["confirmed", "in_transit", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # If delivered, credit seller
    if status == "delivered" and order["status"] != "delivered":
        await db.users.update_one(
            {"id": order["seller_id"]},
            {"$inc": {"wallet_balance": order["total_amount"]}}
        )
        
        # Add loyalty points
        await db.users.update_one(
            {"id": order["buyer_id"]},
            {"$inc": {"loyalty_points": int(order["total_amount"] / 100)}}
        )
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Order status updated to {status}"}

# ==================== SERVICES ROUTES ====================

@api_router.post("/services", response_model=Service)
async def create_service(data: ServiceCreate, user: dict = Depends(get_current_user)):
    service = Service(
        provider_id=user["id"],
        provider_name=user["full_name"],
        **data.dict()
    )
    await db.services.insert_one(service.dict())
    return service

@api_router.get("/services")
async def get_services(
    service_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
):
    query = {"is_available": True}
    
    if service_type:
        query["service_type"] = service_type
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    services = await db.services.find(query).sort("created_at", -1).to_list(limit)
    return services

@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@api_router.get("/my-services")
async def get_my_services(user: dict = Depends(get_current_user)):
    services = await db.services.find(
        {"provider_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    return services

@api_router.post("/services/book", response_model=ServiceBooking)
async def book_service(data: ServiceBookingCreate, user: dict = Depends(get_current_user)):
    service = await db.services.find_one({"id": data.service_id, "is_available": True})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service["provider_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot book your own service")
    
    # Check wallet balance
    if user.get("wallet_balance", 0.0) < service["price"]:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    
    # Deduct from wallet (escrow)
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_balance": -service["price"]}}
    )
    
    booking = ServiceBooking(
        service_id=service["id"],
        service_title=service["title"],
        client_id=user["id"],
        client_name=user["full_name"],
        provider_id=service["provider_id"],
        provider_name=service["provider_name"],
        scheduled_date=data.scheduled_date,
        scheduled_time=data.scheduled_time,
        notes=data.notes,
        location=data.location,
        amount=service["price"]
    )
    
    await db.service_bookings.insert_one(booking.dict())
    
    # Record transaction
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=service["price"],
        transaction_type="purchase",
        description=f"Service Booking: {service['title']}",
        reference=f"SVC-{booking.id[:8].upper()}"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return booking

@api_router.get("/bookings")
async def get_my_bookings(user: dict = Depends(get_current_user)):
    bookings = await db.service_bookings.find(
        {"$or": [{"client_id": user["id"]}, {"provider_id": user["id"]}]}
    ).sort("created_at", -1).to_list(100)
    return bookings

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status: str,
    user: dict = Depends(get_current_user)
):
    booking = await db.service_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["provider_id"] != user["id"] and booking["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # If completed, release payment to provider
    if status == "completed" and booking["status"] != "completed":
        await db.users.update_one(
            {"id": booking["provider_id"]},
            {"$inc": {"wallet_balance": booking["amount"]}}
        )
        await db.users.update_one(
            {"id": booking["client_id"]},
            {"$inc": {"loyalty_points": int(booking["amount"] / 100)}}
        )
    
    await db.service_bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status}}
    )
    
    return {"message": f"Booking status updated to {status}"}

# ==================== RESTAURANT & FOOD ROUTES ====================

@api_router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(data: RestaurantCreate, user: dict = Depends(get_current_user)):
    restaurant = Restaurant(
        owner_id=user["id"],
        **data.dict()
    )
    await db.restaurants.insert_one(restaurant.dict())
    return restaurant

@api_router.get("/restaurants")
async def get_restaurants(
    cuisine: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"is_open": True}
    
    if cuisine:
        query["cuisine_type"] = cuisine
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    restaurants = await db.restaurants.find(query).sort("rating", -1).to_list(50)
    return restaurants

@api_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: str):
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant

@api_router.post("/menu-items", response_model=MenuItem)
async def create_menu_item(data: MenuItemCreate, user: dict = Depends(get_current_user)):
    # Verify user owns the restaurant
    restaurant = await db.restaurants.find_one({
        "id": data.restaurant_id,
        "owner_id": user["id"]
    })
    if not restaurant:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    menu_item = MenuItem(**data.dict())
    await db.menu_items.insert_one(menu_item.dict())
    return menu_item

@api_router.get("/restaurants/{restaurant_id}/menu")
async def get_menu(restaurant_id: str):
    items = await db.menu_items.find(
        {"restaurant_id": restaurant_id, "is_available": True}
    ).to_list(100)
    return items

@api_router.post("/food-orders", response_model=FoodOrder)
async def create_food_order(data: FoodOrderCreate, user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"id": data.restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Calculate total
    subtotal = 0
    order_items = []
    
    for item in data.items:
        menu_item = await db.menu_items.find_one({"id": item["menu_item_id"]})
        if menu_item:
            item_total = menu_item["price"] * item["quantity"]
            subtotal += item_total
            order_items.append({
                "menu_item_id": menu_item["id"],
                "name": menu_item["name"],
                "price": menu_item["price"],
                "quantity": item["quantity"],
                "total": item_total
            })
    
    delivery_fee = 200.0
    total_amount = subtotal + delivery_fee
    
    # Check wallet
    if user.get("wallet_balance", 0.0) < total_amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    
    # Deduct from wallet
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_balance": -total_amount}}
    )
    
    order = FoodOrder(
        customer_id=user["id"],
        customer_name=user["full_name"],
        restaurant_id=restaurant["id"],
        restaurant_name=restaurant["name"],
        items=order_items,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total_amount=total_amount,
        delivery_address=data.delivery_address,
        notes=data.notes
    )
    
    await db.food_orders.insert_one(order.dict())
    
    # Record transaction
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=total_amount,
        transaction_type="purchase",
        description=f"Food Order: {restaurant['name']}",
        reference=f"FOOD-{order.id[:8].upper()}"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return order

@api_router.get("/food-orders")
async def get_my_food_orders(user: dict = Depends(get_current_user)):
    orders = await db.food_orders.find(
        {"customer_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    return orders

@api_router.put("/food-orders/{order_id}/status")
async def update_food_order_status(
    order_id: str,
    status: str,
    user: dict = Depends(get_current_user)
):
    order = await db.food_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    restaurant = await db.restaurants.find_one({"id": order["restaurant_id"]})
    
    if restaurant["owner_id"] != user["id"] and order["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # If delivered, credit restaurant owner
    if status == "delivered" and order["status"] != "delivered":
        await db.users.update_one(
            {"id": restaurant["owner_id"]},
            {"$inc": {"wallet_balance": order["subtotal"]}}
        )
        await db.users.update_one(
            {"id": order["customer_id"]},
            {"$inc": {"loyalty_points": int(order["total_amount"] / 100)}}
        )
    
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {"status": status}}
    )
    
    return {"message": f"Order status updated to {status}"}

# ==================== REVIEWS ROUTES ====================

@api_router.post("/reviews", response_model=Review)
async def create_review(data: ReviewCreate, user: dict = Depends(get_current_user)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    
    review = Review(
        user_id=user["id"],
        user_name=user["full_name"],
        **data.dict()
    )
    
    await db.reviews.insert_one(review.dict())
    
    # Update average rating for target
    collection_map = {
        "product": db.products,
        "service": db.services,
        "restaurant": db.restaurants
    }
    
    target_collection = collection_map.get(data.target_type)
    if target_collection:
        reviews = await db.reviews.find({"target_id": data.target_id}).to_list(1000)
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
        await target_collection.update_one(
            {"id": data.target_id},
            {"$set": {"rating": round(avg_rating, 1), "total_reviews": len(reviews)}}
        )
    
    return review

@api_router.get("/reviews/{target_id}")
async def get_reviews(target_id: str):
    reviews = await db.reviews.find(
        {"target_id": target_id}
    ).sort("created_at", -1).to_list(100)
    return reviews

# ==================== CATEGORIES ====================

@api_router.get("/categories")
async def get_categories():
    return {
        "product_categories": [
            {"id": "electronics", "name": "Electronics", "icon": "laptop"},
            {"id": "fashion", "name": "Fashion", "icon": "shirt"},
            {"id": "books", "name": "Books", "icon": "book"},
            {"id": "furniture", "name": "Furniture", "icon": "bed"},
            {"id": "food", "name": "Food Items", "icon": "restaurant"},
            {"id": "other", "name": "Other", "icon": "cube"}
        ],
        "service_types": [
            {"id": "makeup", "name": "Makeup & Beauty", "icon": "color-palette"},
            {"id": "photography", "name": "Photography", "icon": "camera"},
            {"id": "project_writing", "name": "Project Writing", "icon": "document-text"},
            {"id": "topic_verification", "name": "Topic Verification", "icon": "checkmark-circle"},
            {"id": "tutoring", "name": "Tutoring", "icon": "school"},
            {"id": "other", "name": "Other Services", "icon": "construct"}
        ],
        "cuisine_types": [
            {"id": "nigerian", "name": "Nigerian", "icon": "restaurant"},
            {"id": "continental", "name": "Continental", "icon": "globe"},
            {"id": "chinese", "name": "Chinese", "icon": "restaurant"},
            {"id": "fast_food", "name": "Fast Food", "icon": "fast-food"},
            {"id": "drinks", "name": "Drinks & Smoothies", "icon": "cafe"},
            {"id": "snacks", "name": "Snacks", "icon": "pizza"}
        ]
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "CommuteShare API v1.0", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
