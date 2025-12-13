from flask import Flask, render_template
from dotenv import load_dotenv
import os
load_dotenv()
import secrets
import mysql.connector
from flask_mail import Mail
from itsdangerous import URLSafeTimedSerializer
from registration.registration import registration_app
from login.login import login_app
from seller.homepage_seller import homepage_seller_app
from seller.add_product import add_product_app
from seller.payment_options import payment_options_app
from seller.seller_orders import seller_orders_app
from buyer.homepage_buyer import homepage_buyer_app
from buyer.cart import cart_app
from buyer.viewproduct import viewproduct_app
from seller.seller_address import seller_address_app
from buyer.buyer_address import buyer_address_app
from seller.seller_account import seller_account_app
from buyer.buyer_account import buyer_account_app
from buyer.buyer_payment_options import buyer_payment_options_app
from seller.dashboard import dashboard_app

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# URL serializer for generating reset tokens
s = URLSafeTimedSerializer(app.secret_key)


@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Database configuration
db_config = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)),  # default port if not set
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE"),
    "use_pure": True                          
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# Mail configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = os.getenv("MAIL_DEFAULT_SENDER")

mail = Mail(app)

# File upload path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    'static',
    'images',
    'products'
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Register blueprints (except reset_app for now)
app.register_blueprint(registration_app)
app.register_blueprint(login_app)
app.register_blueprint(homepage_seller_app)
app.register_blueprint(add_product_app)
app.register_blueprint(payment_options_app)
app.register_blueprint(seller_orders_app)
app.register_blueprint(homepage_buyer_app)
app.register_blueprint(cart_app)
app.register_blueprint(viewproduct_app)
app.register_blueprint(seller_address_app)
app.register_blueprint(buyer_address_app)
app.register_blueprint(seller_account_app)
app.register_blueprint(buyer_account_app)
app.register_blueprint(buyer_payment_options_app)
app.register_blueprint(dashboard_app)

from reset_password.routes import reset_app
app.register_blueprint(reset_app)

# Main route
@app.route('/')
def index():
    return render_template('index.html')    

if __name__ == '__main__':
    app.run(debug=True)
