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
import httpx

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

# Solana Configuration
SOLANA_NETWORK = os.environ.get('SOLANA_NETWORK', 'devnet')  # devnet, testnet, mainnet-beta
SOLANA_RPC_URL = {
    'devnet': 'https://api.devnet.solana.com',
    'testnet': 'https://api.testnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com'
}.get(SOLANA_NETWORK, 'https://api.devnet.solana.com')

# COST Token Configuration (Update after deployment)
COST_TOKEN_MINT = os.environ.get('COST_TOKEN_MINT', '')  # Will be set after token creation
COST_TOKEN_DECIMALS = 9
COST_WELCOME_BONUS = 10.0  # Welcome bonus for new users

# Membership Tiers based on COST balance
MEMBERSHIP_TIERS = {
    'platinum': {'min_balance': 100000, 'discount': 50, 'color': '#E5E4E2', 'icon': 'trophy'},
    'gold': {'min_balance': 50000, 'discount': 40, 'color': '#FFD700', 'icon': 'medal'},
    'silver': {'min_balance': 30000, 'discount': 30, 'color': '#C0C0C0', 'icon': 'ribbon'},
    'bronze': {'min_balance': 15000, 'discount': 20, 'color': '#CD7F32', 'icon': 'star'},
    'basic': {'min_balance': 0, 'discount': 10, 'color': '#808080', 'icon': 'person'},
}

# USDT Token Addresses on Solana
USDT_TOKEN_MINT = {
    'devnet': 'So11111111111111111111111111111111111111112',  # Wrapped SOL for testing
    'mainnet-beta': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  # Real USDT
}.get(SOLANA_NETWORK, 'So11111111111111111111111111111111111111112')

# Currency data by country code
CURRENCY_DATA = {
    'NG': {'code': 'NGN', 'symbol': '₦', 'name': 'Nigerian Naira'},
    'US': {'code': 'USD', 'symbol': '$', 'name': 'US Dollar'},
    'GB': {'code': 'GBP', 'symbol': '£', 'name': 'British Pound'},
    'EU': {'code': 'EUR', 'symbol': '€', 'name': 'Euro'},
    'GH': {'code': 'GHS', 'symbol': 'GH₵', 'name': 'Ghanaian Cedi'},
    'KE': {'code': 'KES', 'symbol': 'KSh', 'name': 'Kenyan Shilling'},
    'ZA': {'code': 'ZAR', 'symbol': 'R', 'name': 'South African Rand'},
    'IN': {'code': 'INR', 'symbol': '₹', 'name': 'Indian Rupee'},
    'CN': {'code': 'CNY', 'symbol': '¥', 'name': 'Chinese Yuan'},
    'JP': {'code': 'JPY', 'symbol': '¥', 'name': 'Japanese Yen'},
    'AE': {'code': 'AED', 'symbol': 'د.إ', 'name': 'UAE Dirham'},
    'CA': {'code': 'CAD', 'symbol': 'C$', 'name': 'Canadian Dollar'},
    'AU': {'code': 'AUD', 'symbol': 'A$', 'name': 'Australian Dollar'},
    'BR': {'code': 'BRL', 'symbol': 'R$', 'name': 'Brazilian Real'},
    'MX': {'code': 'MXN', 'symbol': 'MX$', 'name': 'Mexican Peso'},
    'DEFAULT': {'code': 'USD', 'symbol': '$', 'name': 'US Dollar'},
}

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
    country_code: Optional[str] = 'NG'
    
    @validator('email')
    def validate_email(cls, v):
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
    country_code: str = 'NG'
    currency: Dict[str, str] = {}
    created_at: datetime
    # Crypto wallets
    solana_wallet: Optional[str] = None
    cost_balance: float = 0.0
    sol_balance: float = 0.0
    usdt_balance: float = 0.0
    # Membership tier
    membership_tier: Optional[Dict[str, Any]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Wallet Models
class WalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    currency: str  # NGN, USD, SOL, USDT, COST
    transaction_type: str  # deposit, withdrawal, purchase, sale, refund, swap
    description: str
    status: str = "completed"
    reference: Optional[str] = None
    discount_applied: float = 0.0
    original_amount: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DepositRequest(BaseModel):
    amount: float
    currency: str = 'fiat'  # fiat, SOL, USDT, COST
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class WithdrawalRequest(BaseModel):
    amount: float
    currency: str = 'fiat'  # fiat, SOL, USDT, COST
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    solana_address: Optional[str] = None
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class SwapRequest(BaseModel):
    from_currency: str  # fiat, SOL, USDT, COST
    to_currency: str
    amount: float

class PaymentRequest(BaseModel):
    amount: float
    currency: str = 'fiat'  # fiat, SOL, USDT, COST
    description: str
    recipient_id: Optional[str] = None

# Crypto Wallet Models
class CreateSolanaWallet(BaseModel):
    pass  # No params needed, generates new wallet

class ImportSolanaWallet(BaseModel):
    private_key: str  # Base58 encoded

# Product Models
class ProductCreate(BaseModel):
    title: str
    description: str
    price: float
    price_in_cost: Optional[float] = None  # Price in COST tokens
    category: str
    subcategory: Optional[str] = None
    condition: str = "new"
    images: List[str] = []
    location: Optional[str] = None
    quantity: int = 1
    accept_cost_token: bool = True  # Accept COST token payments

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str
    seller_name: str
    title: str
    description: str
    price: float
    price_in_cost: Optional[float] = None
    category: str
    subcategory: Optional[str] = None
    condition: str = "new"
    images: List[str] = []
    location: Optional[str] = None
    quantity: int = 1
    is_available: bool = True
    views: int = 0
    accept_cost_token: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Order Models
class OrderCreate(BaseModel):
    product_id: str
    quantity: int = 1
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    payment_currency: str = 'fiat'  # fiat, SOL, USDT, COST

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
    discount_applied: float = 0.0
    final_amount: float = 0.0
    payment_currency: str = 'fiat'
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Service Models
class ServiceCreate(BaseModel):
    title: str
    description: str
    price: float
    price_in_cost: Optional[float] = None
    service_type: str
    duration: Optional[str] = None
    images: List[str] = []
    location: Optional[str] = None
    availability: Optional[str] = None
    accept_cost_token: bool = True

class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider_id: str
    provider_name: str
    title: str
    description: str
    price: float
    price_in_cost: Optional[float] = None
    service_type: str
    duration: Optional[str] = None
    images: List[str] = []
    location: Optional[str] = None
    availability: Optional[str] = None
    rating: float = 0.0
    total_reviews: int = 0
    is_available: bool = True
    accept_cost_token: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceBookingCreate(BaseModel):
    service_id: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    payment_currency: str = 'fiat'

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
    discount_applied: float = 0.0
    final_amount: float = 0.0
    payment_currency: str = 'fiat'
    status: str = "pending"
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
    accept_cost_token: bool = True

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
    accept_cost_token: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    restaurant_id: str
    name: str
    description: str
    price: float
    price_in_cost: Optional[float] = None
    category: str
    image: Optional[str] = None
    is_available: bool = True

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    description: str
    price: float
    price_in_cost: Optional[float] = None
    category: str
    image: Optional[str] = None
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FoodOrderCreate(BaseModel):
    restaurant_id: str
    items: List[Dict[str, Any]]
    delivery_address: str
    notes: Optional[str] = None
    payment_currency: str = 'fiat'

class FoodOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    restaurant_id: str
    restaurant_name: str
    items: List[Dict[str, Any]]
    subtotal: float
    delivery_fee: float = 200.0
    discount_applied: float = 0.0
    total_amount: float
    final_amount: float = 0.0
    payment_currency: str = 'fiat'
    delivery_address: str
    notes: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Review Model
class ReviewCreate(BaseModel):
    target_id: str
    target_type: str
    rating: int
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

def get_currency_for_country(country_code: str) -> Dict[str, str]:
    return CURRENCY_DATA.get(country_code.upper(), CURRENCY_DATA['DEFAULT'])

def get_membership_tier(cost_balance: float) -> Dict[str, Any]:
    """
    Determine user's membership tier based on COST token balance.
    Tiers update instantly when balance changes.
    """
    if cost_balance >= 100000:
        tier = 'platinum'
    elif cost_balance >= 50000:
        tier = 'gold'
    elif cost_balance >= 30000:
        tier = 'silver'
    elif cost_balance >= 15000:
        tier = 'bronze'
    else:
        tier = 'basic'
    
    tier_info = MEMBERSHIP_TIERS[tier]
    return {
        'tier': tier,
        'tier_name': tier.capitalize(),
        'discount': tier_info['discount'],
        'color': tier_info['color'],
        'icon': tier_info['icon'],
        'min_balance': tier_info['min_balance'],
        'cost_balance': cost_balance,
        'next_tier': get_next_tier_info(tier, cost_balance)
    }

def get_next_tier_info(current_tier: str, current_balance: float) -> Optional[Dict[str, Any]]:
    """Get info about the next tier and how much COST needed to reach it."""
    tier_order = ['basic', 'bronze', 'silver', 'gold', 'platinum']
    current_index = tier_order.index(current_tier)
    
    if current_index >= len(tier_order) - 1:
        return None  # Already at highest tier
    
    next_tier = tier_order[current_index + 1]
    next_tier_info = MEMBERSHIP_TIERS[next_tier]
    tokens_needed = next_tier_info['min_balance'] - current_balance
    
    return {
        'tier': next_tier,
        'tier_name': next_tier.capitalize(),
        'discount': next_tier_info['discount'],
        'color': next_tier_info['color'],
        'min_balance': next_tier_info['min_balance'],
        'tokens_needed': tokens_needed
    }

def calculate_discount(user: dict, payment_currency: str, amount: float) -> tuple:
    """
    Calculate discount based on membership tier (COST balance).
    - Basic (0-14,999 COST): 10% discount
    - Bronze (15,000+ COST): 20% discount
    - Silver (30,000+ COST): 30% discount
    - Gold (50,000+ COST): 40% discount
    - Platinum (100,000+ COST): 50% discount
    """
    cost_balance = user.get('cost_balance', 0.0)
    membership = get_membership_tier(cost_balance)
    
    if payment_currency == 'COST':
        # Use membership tier discount when paying with COST
        discount_percent = membership['discount']
    else:
        # Non-COST payments get a flat 5% discount
        discount_percent = 5
    
    discount_amount = amount * (discount_percent / 100)
    final_amount = amount - discount_amount
    
    return discount_percent, discount_amount, final_amount

async def get_exchange_rates():
    """Get current exchange rates (mock for now, integrate real API later)"""
    # Mock exchange rates - in production, use CoinGecko, Binance, or similar API
    return {
        'SOL_USD': 180.0,
        'USDT_USD': 1.0,
        'COST_USD': 0.05,  # Initial COST token price
        'USD_NGN': 1600.0,
        'USD_GBP': 0.79,
        'USD_EUR': 0.92,
        'USD_GHS': 15.5,
        'USD_KES': 153.0,
        'USD_ZAR': 18.5,
        'USD_INR': 83.5,
        'USD_CNY': 7.2,
        'USD_JPY': 157.0,
        'USD_AED': 3.67,
        'USD_CAD': 1.36,
        'USD_AUD': 1.53,
        'USD_BRL': 5.0,
        'USD_MXN': 17.2,
    }

async def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    """Convert between currencies"""
    rates = await get_exchange_rates()
    
    # First convert to USD
    if from_currency == 'USD':
        usd_amount = amount
    elif from_currency == 'SOL':
        usd_amount = amount * rates['SOL_USD']
    elif from_currency == 'USDT':
        usd_amount = amount * rates['USDT_USD']
    elif from_currency == 'COST':
        usd_amount = amount * rates['COST_USD']
    else:
        # Fiat currency
        rate_key = f'USD_{from_currency}'
        if rate_key in rates:
            usd_amount = amount / rates[rate_key]
        else:
            usd_amount = amount  # Assume USD if unknown
    
    # Then convert from USD to target
    if to_currency == 'USD':
        return usd_amount
    elif to_currency == 'SOL':
        return usd_amount / rates['SOL_USD']
    elif to_currency == 'USDT':
        return usd_amount / rates['USDT_USD']
    elif to_currency == 'COST':
        return usd_amount / rates['COST_USD']
    else:
        rate_key = f'USD_{to_currency}'
        if rate_key in rates:
            return usd_amount * rates[rate_key]
        return usd_amount

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    currency = get_currency_for_country(data.country_code or 'NG')
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "full_name": data.full_name,
        "phone": data.phone,
        "nin": data.nin,
        "university_name": data.university_name,
        "country_code": data.country_code or 'NG',
        "currency": currency,
        "is_verified": False,
        "wallet_balance": 0.0,
        "loyalty_points": 0,
        # Crypto balances - new users get welcome bonus
        "solana_wallet": None,
        "cost_balance": COST_WELCOME_BONUS,  # 10 COST welcome bonus
        "sol_balance": 0.0,
        "usdt_balance": 0.0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    # Record welcome bonus transaction
    welcome_transaction = WalletTransaction(
        user_id=user_id,
        amount=COST_WELCOME_BONUS,
        currency="COST",
        transaction_type="deposit",
        description="Welcome Bonus - 10 COST tokens!",
        reference=f"WELCOME-{uuid.uuid4().hex[:8].upper()}"
    )
    await db.transactions.insert_one(welcome_transaction.dict())
    
    token = create_token(user_id)
    membership = get_membership_tier(user["cost_balance"])
    
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
            country_code=user["country_code"],
            currency=user["currency"],
            created_at=user["created_at"],
            solana_wallet=user.get("solana_wallet"),
            cost_balance=user.get("cost_balance", 0.0),
            sol_balance=user.get("sol_balance", 0.0),
            usdt_balance=user.get("usdt_balance", 0.0),
            membership_tier=membership,
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    membership = get_membership_tier(user.get("cost_balance", 0.0))
    
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
            country_code=user.get("country_code", 'NG'),
            currency=user.get("currency", get_currency_for_country('NG')),
            created_at=user["created_at"],
            solana_wallet=user.get("solana_wallet"),
            cost_balance=user.get("cost_balance", 0.0),
            sol_balance=user.get("sol_balance", 0.0),
            usdt_balance=user.get("usdt_balance", 0.0),
            membership_tier=membership,
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    membership = get_membership_tier(user.get("cost_balance", 0.0))
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        phone=user["phone"],
        university_name=user.get("university_name"),
        is_verified=user.get("is_verified", False),
        wallet_balance=user.get("wallet_balance", 0.0),
        loyalty_points=user.get("loyalty_points", 0),
        country_code=user.get("country_code", 'NG'),
        currency=user.get("currency", get_currency_for_country('NG')),
        created_at=user["created_at"],
        solana_wallet=user.get("solana_wallet"),
        cost_balance=user.get("cost_balance", 0.0),
        sol_balance=user.get("sol_balance", 0.0),
        usdt_balance=user.get("usdt_balance", 0.0),
        membership_tier=membership,
    )

@api_router.put("/auth/country")
async def update_country(country_code: str, user: dict = Depends(get_current_user)):
    currency = get_currency_for_country(country_code)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"country_code": country_code, "currency": currency}}
    )
    return {"message": "Country updated", "currency": currency}

# ==================== WALLET ROUTES ====================

@api_router.get("/wallet/balance")
async def get_wallet_balance(user: dict = Depends(get_current_user)):
    rates = await get_exchange_rates()
    currency = user.get('currency', get_currency_for_country('NG'))
    
    # Calculate total balance in user's local currency
    fiat_balance = user.get("wallet_balance", 0.0)
    sol_in_fiat = await convert_currency(user.get("sol_balance", 0.0), 'SOL', currency['code'])
    usdt_in_fiat = await convert_currency(user.get("usdt_balance", 0.0), 'USDT', currency['code'])
    cost_in_fiat = await convert_currency(user.get("cost_balance", 0.0), 'COST', currency['code'])
    
    total_in_fiat = fiat_balance + sol_in_fiat + usdt_in_fiat + cost_in_fiat
    
    # Get membership tier
    membership = get_membership_tier(user.get("cost_balance", 0.0))
    
    return {
        "fiat_balance": user.get("wallet_balance", 0.0),
        "sol_balance": user.get("sol_balance", 0.0),
        "usdt_balance": user.get("usdt_balance", 0.0),
        "cost_balance": user.get("cost_balance", 0.0),
        "total_in_fiat": total_in_fiat,
        "loyalty_points": user.get("loyalty_points", 0),
        "currency": currency,
        "solana_wallet": user.get("solana_wallet"),
        "exchange_rates": rates,
        "membership": membership,
    }

@api_router.post("/wallet/deposit")
async def deposit_funds(data: DepositRequest, user: dict = Depends(get_current_user)):
    currency = data.currency.upper()
    balance_field = {
        'FIAT': 'wallet_balance',
        'SOL': 'sol_balance',
        'USDT': 'usdt_balance',
        'COST': 'cost_balance',
    }.get(currency, 'wallet_balance')
    
    current_balance = user.get(balance_field, 0.0)
    new_balance = current_balance + data.amount
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {balance_field: new_balance}}
    )
    
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=data.amount,
        currency=currency,
        transaction_type="deposit",
        description=f"Deposit of {data.amount} {currency}",
        reference=f"DEP-{uuid.uuid4().hex[:8].upper()}"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {
        "message": f"Deposit successful (Mock)",
        "new_balance": new_balance,
        "currency": currency,
        "reference": transaction.reference
    }

@api_router.post("/wallet/withdraw")
async def withdraw_funds(data: WithdrawalRequest, user: dict = Depends(get_current_user)):
    currency = data.currency.upper()
    balance_field = {
        'FIAT': 'wallet_balance',
        'SOL': 'sol_balance',
        'USDT': 'usdt_balance',
        'COST': 'cost_balance',
    }.get(currency, 'wallet_balance')
    
    current_balance = user.get(balance_field, 0.0)
    
    if data.amount > current_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient {currency} balance")
    
    # For fiat withdrawals, verify bank account name
    if currency == 'FIAT' and data.account_name:
        user_name_parts = user["full_name"].lower().split()
        account_name_parts = data.account_name.lower().split()
        name_match = any(part in account_name_parts for part in user_name_parts)
        if not name_match:
            raise HTTPException(
                status_code=400,
                detail="Bank account name must match your registered name for security"
            )
    
    # For crypto withdrawals, verify solana address
    if currency in ['SOL', 'USDT', 'COST'] and not data.solana_address:
        raise HTTPException(status_code=400, detail="Solana address required for crypto withdrawal")
    
    new_balance = current_balance - data.amount
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {balance_field: new_balance}}
    )
    
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=data.amount,
        currency=currency,
        transaction_type="withdrawal",
        description=f"Withdrawal of {data.amount} {currency}",
        reference=f"WTH-{uuid.uuid4().hex[:8].upper()}"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {
        "message": f"Withdrawal request submitted (Mock)",
        "new_balance": new_balance,
        "currency": currency,
        "reference": transaction.reference
    }

@api_router.post("/wallet/swap")
async def swap_currency(data: SwapRequest, user: dict = Depends(get_current_user)):
    """Swap between currencies"""
    from_currency = data.from_currency.upper()
    to_currency = data.to_currency.upper()
    
    from_field = {
        'FIAT': 'wallet_balance',
        'SOL': 'sol_balance',
        'USDT': 'usdt_balance',
        'COST': 'cost_balance',
    }.get(from_currency, 'wallet_balance')
    
    to_field = {
        'FIAT': 'wallet_balance',
        'SOL': 'sol_balance',
        'USDT': 'usdt_balance',
        'COST': 'cost_balance',
    }.get(to_currency, 'wallet_balance')
    
    from_balance = user.get(from_field, 0.0)
    
    if data.amount > from_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient {from_currency} balance")
    
    # Get user's fiat currency for conversion
    user_currency = user.get('currency', {}).get('code', 'USD')
    if from_currency == 'FIAT':
        from_currency = user_currency
    if to_currency == 'FIAT':
        to_currency = user_currency
    
    # Convert amount
    converted_amount = await convert_currency(data.amount, from_currency, to_currency)
    
    # Apply 1% swap fee
    swap_fee = converted_amount * 0.01
    final_amount = converted_amount - swap_fee
    
    # Update balances
    new_from_balance = from_balance - data.amount
    to_balance = user.get(to_field, 0.0)
    new_to_balance = to_balance + final_amount
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            from_field: new_from_balance,
            to_field: new_to_balance
        }}
    )
    
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=data.amount,
        currency=f"{data.from_currency}->{data.to_currency}",
        transaction_type="swap",
        description=f"Swapped {data.amount} {data.from_currency} to {final_amount:.6f} {data.to_currency}",
        reference=f"SWP-{uuid.uuid4().hex[:8].upper()}"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {
        "message": "Swap successful",
        "from_currency": data.from_currency,
        "to_currency": data.to_currency,
        "amount_sent": data.amount,
        "amount_received": final_amount,
        "swap_fee": swap_fee,
        "reference": transaction.reference
    }

@api_router.get("/wallet/transactions")
async def get_transactions(user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    return transactions

@api_router.get("/wallet/exchange-rates")
async def get_rates():
    rates = await get_exchange_rates()
    return rates

@api_router.get("/wallet/discount-info")
async def get_discount_info(user: dict = Depends(get_current_user)):
    """Get discount information based on membership tier"""
    cost_balance = user.get('cost_balance', 0.0)
    membership = get_membership_tier(cost_balance)
    
    return {
        "membership": membership,
        "discounts": {
            "fiat": 5,
            "sol": 5,
            "usdt": 5,
            "cost": membership['discount']
        },
        "message": f"{membership['tier_name']} Member - {membership['discount']}% discount with COST!",
        "tier_benefits": {
            "basic": {"min": 0, "max": 14999, "discount": 10},
            "bronze": {"min": 15000, "max": 29999, "discount": 20},
            "silver": {"min": 30000, "max": 49999, "discount": 30},
            "gold": {"min": 50000, "max": 99999, "discount": 40},
            "platinum": {"min": 100000, "max": None, "discount": 50},
        }
    }

# ==================== SOLANA WALLET ROUTES ====================

@api_router.post("/wallet/solana/create")
async def create_solana_wallet(user: dict = Depends(get_current_user)):
    """Create a new Solana wallet for the user (mock - returns placeholder)"""
    if user.get("solana_wallet"):
        raise HTTPException(status_code=400, detail="Solana wallet already exists")
    
    # In production, use @solana/web3.js Keypair.generate()
    # Mock wallet address
    mock_wallet = f"CS{uuid.uuid4().hex[:30].upper()}"
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"solana_wallet": mock_wallet}}
    )
    
    return {
        "message": "Solana wallet created (Mock)",
        "wallet_address": mock_wallet,
        "network": SOLANA_NETWORK,
        "note": "In production, this would generate a real Solana keypair"
    }

@api_router.get("/wallet/solana/info")
async def get_solana_wallet_info(user: dict = Depends(get_current_user)):
    """Get Solana wallet information"""
    return {
        "wallet_address": user.get("solana_wallet"),
        "network": SOLANA_NETWORK,
        "rpc_url": SOLANA_RPC_URL,
        "cost_token_mint": COST_TOKEN_MINT or "Not deployed yet",
        "usdt_token_mint": USDT_TOKEN_MINT,
        "balances": {
            "SOL": user.get("sol_balance", 0.0),
            "USDT": user.get("usdt_balance", 0.0),
            "COST": user.get("cost_balance", 0.0),
        }
    }

# ==================== TOKEN INFO ROUTES ====================

@api_router.get("/token/info")
async def get_token_info():
    """Get COST token information"""
    rates = await get_exchange_rates()
    return {
        "name": "CommuteShare Token",
        "symbol": "COST",
        "decimals": COST_TOKEN_DECIMALS,
        "network": SOLANA_NETWORK,
        "mint_address": COST_TOKEN_MINT or "Not deployed yet",
        "price_usd": rates['COST_USD'],
        "welcome_bonus": COST_WELCOME_BONUS,
        "benefits": [
            "10-50% discount based on membership tier",
            "10 COST welcome bonus for new users",
            "Instant tier upgrades when you deposit more",
            "Loyalty rewards on all purchases",
            "Governance voting (coming soon)",
            "Staking rewards (coming soon)"
        ],
        "membership_tiers": [
            {"tier": "basic", "name": "Basic", "min_balance": 0, "max_balance": 14999, "discount": 10, "color": "#808080"},
            {"tier": "bronze", "name": "Bronze", "min_balance": 15000, "max_balance": 29999, "discount": 20, "color": "#CD7F32"},
            {"tier": "silver", "name": "Silver", "min_balance": 30000, "max_balance": 49999, "discount": 30, "color": "#C0C0C0"},
            {"tier": "gold", "name": "Gold", "min_balance": 50000, "max_balance": 99999, "discount": 40, "color": "#FFD700"},
            {"tier": "platinum", "name": "Platinum", "min_balance": 100000, "max_balance": None, "discount": 50, "color": "#E5E4E2"},
        ],
        "total_supply": "1,000,000,000 COST",
        "circulating_supply": "100,000,000 COST (testnet)"
    }

# ==================== MARKETPLACE ROUTES ====================

@api_router.post("/products", response_model=Product)
async def create_product(data: ProductCreate, user: dict = Depends(get_current_user)):
    # Calculate COST price if not provided (based on exchange rate)
    price_in_cost = data.price_in_cost
    if not price_in_cost:
        user_currency = user.get('currency', {}).get('code', 'NGN')
        price_in_cost = await convert_currency(data.price, user_currency, 'COST')
    
    product = Product(
        seller_id=user["id"],
        seller_name=user["full_name"],
        price_in_cost=price_in_cost,
        **data.dict(exclude={'price_in_cost'})
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
    
    # Get price based on payment currency
    payment_currency = data.payment_currency.upper()
    if payment_currency == 'COST' and product.get('price_in_cost'):
        unit_price = product['price_in_cost']
    else:
        unit_price = product["price"]
    
    total_amount = unit_price * data.quantity
    
    # Calculate discount
    discount_percent, discount_amount, final_amount = calculate_discount(
        user, payment_currency, total_amount
    )
    
    # Determine which balance to use
    balance_field = {
        'FIAT': 'wallet_balance',
        'SOL': 'sol_balance',
        'USDT': 'usdt_balance',
        'COST': 'cost_balance',
    }.get(payment_currency, 'wallet_balance')
    
    user_balance = user.get(balance_field, 0.0)
    
    if user_balance < final_amount:
        raise HTTPException(status_code=400, detail=f"Insufficient {payment_currency} balance")
    
    # Deduct from buyer wallet
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {balance_field: -final_amount}}
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
        unit_price=unit_price,
        total_amount=total_amount,
        discount_applied=discount_amount,
        final_amount=final_amount,
        payment_currency=payment_currency,
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
        amount=final_amount,
        currency=payment_currency,
        transaction_type="purchase",
        description=f"Purchase: {product['title']}",
        discount_applied=discount_amount,
        original_amount=total_amount,
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
    
    if order["seller_id"] != user["id"] and order["buyer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    valid_statuses = ["confirmed", "in_transit", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # If delivered, credit seller
    if status == "delivered" and order["status"] != "delivered":
        payment_currency = order.get("payment_currency", "FIAT")
        balance_field = {
            'FIAT': 'wallet_balance',
            'SOL': 'sol_balance',
            'USDT': 'usdt_balance',
            'COST': 'cost_balance',
        }.get(payment_currency, 'wallet_balance')
        
        await db.users.update_one(
            {"id": order["seller_id"]},
            {"$inc": {balance_field: order["final_amount"]}}
        )
        
        # Add loyalty points
        await db.users.update_one(
            {"id": order["buyer_id"]},
            {"$inc": {"loyalty_points": int(order["final_amount"] / 100)}}
        )
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Order status updated to {status}"}

# ==================== SERVICES ROUTES ====================

@api_router.post("/services", response_model=Service)
async def create_service(data: ServiceCreate, user: dict = Depends(get_current_user)):
    price_in_cost = data.price_in_cost
    if not price_in_cost:
        user_currency = user.get('currency', {}).get('code', 'NGN')
        price_in_cost = await convert_currency(data.price, user_currency, 'COST')
    
    service = Service(
        provider_id=user["id"],
        provider_name=user["full_name"],
        price_in_cost=price_in_cost,
        **data.dict(exclude={'price_in_cost'})
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
    
    # Get price based on payment currency
    payment_currency = data.payment_currency.upper()
    if payment_currency == 'COST' and service.get('price_in_cost'):
        amount = service['price_in_cost']
    else:
        amount = service["price"]
    
    # Calculate discount
    discount_percent, discount_amount, final_amount = calculate_discount(
        user, payment_currency, amount
    )
    
    # Determine which balance to use
    balance_field = {
        'FIAT': 'wallet_balance',
        'SOL': 'sol_balance',
        'USDT': 'usdt_balance',
        'COST': 'cost_balance',
    }.get(payment_currency, 'wallet_balance')
    
    user_balance = user.get(balance_field, 0.0)
    
    if user_balance < final_amount:
        raise HTTPException(status_code=400, detail=f"Insufficient {payment_currency} balance")
    
    # Deduct from wallet (escrow)
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {balance_field: -final_amount}}
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
        amount=amount,
        discount_applied=discount_amount,
        final_amount=final_amount,
        payment_currency=payment_currency
    )
    
    await db.service_bookings.insert_one(booking.dict())
    
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=final_amount,
        currency=payment_currency,
        transaction_type="purchase",
        description=f"Service Booking: {service['title']}",
        discount_applied=discount_amount,
        original_amount=amount,
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
    
    if status == "completed" and booking["status"] != "completed":
        payment_currency = booking.get("payment_currency", "FIAT")
        balance_field = {
            'FIAT': 'wallet_balance',
            'SOL': 'sol_balance',
            'USDT': 'usdt_balance',
            'COST': 'cost_balance',
        }.get(payment_currency, 'wallet_balance')
        
        await db.users.update_one(
            {"id": booking["provider_id"]},
            {"$inc": {balance_field: booking["final_amount"]}}
        )
        await db.users.update_one(
            {"id": booking["client_id"]},
            {"$inc": {"loyalty_points": int(booking["final_amount"] / 100)}}
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
    restaurant = await db.restaurants.find_one({
        "id": data.restaurant_id,
        "owner_id": user["id"]
    })
    if not restaurant:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    price_in_cost = data.price_in_cost
    if not price_in_cost:
        user_currency = user.get('currency', {}).get('code', 'NGN')
        price_in_cost = await convert_currency(data.price, user_currency, 'COST')
    
    menu_item = MenuItem(price_in_cost=price_in_cost, **data.dict(exclude={'price_in_cost'}))
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
    
    payment_currency = data.payment_currency.upper()
    subtotal = 0
    order_items = []
    
    for item in data.items:
        menu_item = await db.menu_items.find_one({"id": item["menu_item_id"]})
        if menu_item:
            if payment_currency == 'COST' and menu_item.get('price_in_cost'):
                item_price = menu_item['price_in_cost']
            else:
                item_price = menu_item["price"]
            item_total = item_price * item["quantity"]
            subtotal += item_total
            order_items.append({
                "menu_item_id": menu_item["id"],
                "name": menu_item["name"],
                "price": item_price,
                "quantity": item["quantity"],
                "total": item_total
            })
    
    delivery_fee = 200.0
    if payment_currency == 'COST':
        user_currency = user.get('currency', {}).get('code', 'NGN')
        delivery_fee = await convert_currency(200.0, user_currency, 'COST')
    
    total_amount = subtotal + delivery_fee
    
    # Calculate discount
    discount_percent, discount_amount, final_amount = calculate_discount(
        user, payment_currency, total_amount
    )
    
    balance_field = {
        'FIAT': 'wallet_balance',
        'SOL': 'sol_balance',
        'USDT': 'usdt_balance',
        'COST': 'cost_balance',
    }.get(payment_currency, 'wallet_balance')
    
    user_balance = user.get(balance_field, 0.0)
    
    if user_balance < final_amount:
        raise HTTPException(status_code=400, detail=f"Insufficient {payment_currency} balance")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {balance_field: -final_amount}}
    )
    
    order = FoodOrder(
        customer_id=user["id"],
        customer_name=user["full_name"],
        restaurant_id=restaurant["id"],
        restaurant_name=restaurant["name"],
        items=order_items,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        discount_applied=discount_amount,
        total_amount=total_amount,
        final_amount=final_amount,
        payment_currency=payment_currency,
        delivery_address=data.delivery_address,
        notes=data.notes
    )
    
    await db.food_orders.insert_one(order.dict())
    
    transaction = WalletTransaction(
        user_id=user["id"],
        amount=final_amount,
        currency=payment_currency,
        transaction_type="purchase",
        description=f"Food Order: {restaurant['name']}",
        discount_applied=discount_amount,
        original_amount=total_amount,
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
    
    if status == "delivered" and order["status"] != "delivered":
        payment_currency = order.get("payment_currency", "FIAT")
        balance_field = {
            'FIAT': 'wallet_balance',
            'SOL': 'sol_balance',
            'USDT': 'usdt_balance',
            'COST': 'cost_balance',
        }.get(payment_currency, 'wallet_balance')
        
        await db.users.update_one(
            {"id": restaurant["owner_id"]},
            {"$inc": {balance_field: order["subtotal"]}}
        )
        await db.users.update_one(
            {"id": order["customer_id"]},
            {"$inc": {"loyalty_points": int(order["final_amount"] / 100)}}
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
        ],
        "supported_currencies": list(CURRENCY_DATA.values())
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {
        "message": "CommuteShare API v1.0",
        "status": "healthy",
        "features": ["marketplace", "services", "food", "wallet", "COST token"]
    }

@api_router.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "solana_network": SOLANA_NETWORK
    }

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
