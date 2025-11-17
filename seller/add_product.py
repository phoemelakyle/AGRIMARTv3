from flask import Blueprint, render_template, request, redirect, session, jsonify
import mysql.connector
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import os

load_dotenv()

add_product_app = Blueprint('add_product', __name__)

db_config = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)), 
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE"),
    "use_pure": True                                  
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

def generate_product_id():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT MAX(ProductID) FROM product")
    latest_product_id = cursor.fetchone()[0]

    if latest_product_id is not None:
        numeric_part = int(latest_product_id[2:])
        new_numeric_part = numeric_part + 1
    else:
        new_numeric_part = 1000

    product_id = f"PD{new_numeric_part}"
    cursor.close()
    conn.close()

    return product_id  

class Product:
    VOLUMETRIC_FACTOR = 5000
    SHIPPING_RATE_PER_UNIT_WEIGHT = 20
    def __init__(self, productname, weight, packaging_length, packaging_width, packaging_height, category_id, image):
        self.productname = productname
        self.weight = weight
        self.packaging_length = packaging_length
        self.packaging_width = packaging_width
        self.packaging_height = packaging_height
        self.category_id = category_id
        self.image = image
        self.variations = []  
        self.product_id = None

    def add_variation(self, price, quantity, unit=None):
        variation = {'price': price, 'quantity': quantity, 'unit': unit}
        self.variations.append(variation)

    def generate_variation_id(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT MAX(VariationID) FROM product_variation")
        latest_variation_id = cursor.fetchone()[0]

        if latest_variation_id is not None:
            numeric_part = int(latest_variation_id[2:])
            new_numeric_part = numeric_part + 1
        else:
            new_numeric_part = 1000

        variation_id = f"VT{new_numeric_part}"
        cursor.close()
        conn.close()

        return variation_id
   
    def calculate_shipping_fee(self):
        actual_weight = float(self.weight)
        volumetric_weight = (self.packaging_length * self.packaging_width * self.packaging_height) / self.VOLUMETRIC_FACTOR
        return max(actual_weight, volumetric_weight) * self.SHIPPING_RATE_PER_UNIT_WEIGHT

    def insert_into_database(self, user_id, address_id):
        conn = get_db_connection()
        cursor = conn.cursor()

        product_id = generate_product_id()

        shipping_fee = self.calculate_shipping_fee()

        sql_query = "INSERT INTO product (ProductID, SellerID, Product_Name, Weight, Packaging_Length, Packaging_Width, Packaging_Height, CategoryID, ImageFilename, Shipping_Fee, AddressID) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        values = (product_id, user_id, self.productname, self.weight, self.packaging_length, self.packaging_width, self.packaging_height, self.category_id, self.image, shipping_fee, address_id)

        try:
            cursor.execute(sql_query, values)
            conn.commit()

            self.product_id = product_id
           
            for variation in self.variations:
                cursor.execute("""
                SELECT 1 FROM product_variation 
                WHERE ProductID = %s AND Unit = %s AND Price = %s AND Quantity = %s
            """, (self.product_id, variation.get('unit'), variation['price'], variation['quantity']))

                if cursor.fetchone():  
                    continue  

                variation_id = self.generate_variation_id()
                variation_query = "INSERT INTO product_variation (VariationID, ProductID, Unit, Price, Quantity) VALUES (%s, %s, %s, %s, %s)"
                variation_values = (variation_id, self.product_id, variation.get('unit', None), variation['price'], variation['quantity'])
                cursor.execute(variation_query, variation_values)
                conn.commit()

            return True
        except mysql.connector.Error as e:
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

@add_product_app.route('/add_product', methods=['GET', 'POST'])
def add_product():
    from app import app
    user_id = session.get('user_id')
    if 'user_id' not in session:
        session['user_id'] = user_id
    if request.method == 'POST':
        productname = request.form['Product_Name']
        weight = request.form['Weight']
        packaging_length = float(request.form['Packaging_Length'])
        packaging_width = float(request.form['Packaging_Width'])
        packaging_height = float(request.form['Packaging_Height'])
        category_id = request.form['Category']  
       
        image = request.files['Image']
        image_filename = None

        if image:
            image_filename = secure_filename(image.filename)
            image.save(os.path.join(app.config['UPLOAD_FOLDER'], image_filename))

        if productname and weight and packaging_length and packaging_width and packaging_height and category_id:
            product = Product(productname, weight, packaging_length, packaging_width, packaging_height, category_id, image_filename)

            unit = request.form.getlist('Unit')
            prices = request.form.getlist('Price')
            quantities = request.form.getlist('Quantity')
         
            for price, quantity, unit in zip(prices, quantities, unit,):
                price = float(price) if price else None
                quantity = int(quantity) if quantity else None
                product.add_variation(price, quantity, unit)

            address_id = request.form.get('AddressID') 
            success = product.insert_into_database(session['user_id'], address_id)

            if success:
                return redirect('/add_product')  
            else:
                return redirect('/error')  
   
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT CategoryID, Category_Name FROM product_category")
    categories = cursor.fetchall()

    user_id = session.get('user_id')
    cursor.execute("""
        SELECT Full_Name, Phone_Number, Street, Municipality, Province, Region, Zip_Code 
        FROM seller_addresses 
        WHERE SellerID = %s AND isDefault = 1
    """, (user_id,))
    default_address = cursor.fetchone()  

    cursor.close()
    conn.close()

    return render_template('add_product.html', categories=categories, default_address=default_address)

@add_product_app.route('/get_seller_addresses', methods=['GET'])
def get_seller_addresses():
    user_id = session.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT AddressID, Full_Name, Phone_Number, Street, Municipality, Province, Region, Zip_Code
        FROM seller_addresses
        WHERE SellerID = %s
    """, (user_id,))
    addresses = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return jsonify(addresses)  

@add_product_app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return redirect('/login')