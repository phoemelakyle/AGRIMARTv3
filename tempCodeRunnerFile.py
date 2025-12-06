from flask import Flask, render_template
from registration.registration import registration_app
from login.login import login_app
from seller.homepage_seller import homepage_seller_app
from seller.add_product import add_product_app
from seller.payment_options import payment_options_app
from seller.seller_orders import seller_orders_app
from buyer.homepage_buyer import homepage_buyer_app
from buyer.cart import cart_app
from buyer.viewproduct import viewproduct_app
import secrets
import os

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

home_directory = os.path.expanduser("~")
relative_path = 'Desktop/ANGKATANI/static/images/products'
upload_folder = os.path.join(home_directory, relative_path)
app.config['UPLOAD_FOLDER'] = upload_folder

# Register blueprints
app.register_blueprint(registration_app)
app.register_blueprint(login_app)
app.register_blueprint(homepage_seller_app)
app.register_blueprint(add_product_app)
app.register_blueprint(payment_options_app)
app.register_blueprint(seller_orders_app)
app.register_blueprint(homepage_buyer_app)
app.register_blueprint(cart_app)
app.register_blueprint(viewproduct_app)

# Main route
@app.route('/')
def index():
    return render_template('index.html')  # Main home page route

if __name__ == '__main__':
    app.run(debug=True)
