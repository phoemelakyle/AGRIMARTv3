from flask import Blueprint, render_template, request, redirect, flash, session, url_for
import mysql.connector
import os
from werkzeug.utils import secure_filename

homepage_seller_app = Blueprint('homepage_seller', __name__)

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

VOLUMETRIC_FACTOR = 5000
SHIPPING_RATE_PER_UNIT_WEIGHT = 50
def calculate_shipping_fee(new_weight, new_packaging_length, new_packaging_width, new_packaging_height):
    actual_weight = float(new_weight)
    volumetric_weight = (new_packaging_length * new_packaging_width * new_packaging_height) / VOLUMETRIC_FACTOR
    return max(actual_weight, volumetric_weight) * SHIPPING_RATE_PER_UNIT_WEIGHT

def fetch_products_for_seller(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT ProductID, Product_Name, ImageFilename FROM product WHERE SellerID = %s", (seller_id,))
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return products

def fetch_product_details(product_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM product WHERE ProductID = %s", (product_id,))
    product = cursor.fetchone()
    cursor.close()
    conn.close()
    return product

def fetch_variations_for_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM product_variation WHERE ProductID = %s", (product_id,))
    variations = cursor.fetchall()
    cursor.close()
    conn.close()
    return variations

def update_product(product_id, new_product_name, new_weight, new_packaging_length, new_packaging_width, new_packaging_height, new_shipping_fee, new_image_filename):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT ImageFilename FROM product WHERE ProductID = %s", (product_id,))
    previous_image_filename = cursor.fetchone()['ImageFilename']
   
    if new_image_filename is not None:
        delete_previous_image(previous_image_filename)

        new_shipping_fee = calculate_shipping_fee(new_weight, new_packaging_length, new_packaging_width, new_packaging_height)
        sql_query = "UPDATE product SET Product_Name = %s, Weight = %s, Packaging_Length = %s, Packaging_Width = %s, Packaging_Height = %s,  Shipping_Fee = %s, ImageFilename = %s WHERE ProductID = %s"
        values = (new_product_name, new_weight, new_packaging_length, new_packaging_width, new_packaging_height, new_shipping_fee, new_image_filename, product_id)
        cursor.execute(sql_query, values)

    else:
        new_shipping_fee = calculate_shipping_fee(new_weight, new_packaging_length, new_packaging_width, new_packaging_height)
        sql_query = "UPDATE product SET Product_Name = %s, Weight = %s, Packaging_Length = %s, Packaging_Width = %s, Packaging_Height = %s,  Shipping_Fee = %s  WHERE ProductID = %s"
        values = (new_product_name, new_weight, new_packaging_length, new_packaging_width, new_packaging_height, new_shipping_fee, product_id)
        cursor.execute(sql_query, values)

    conn.commit()
    cursor.close()
    conn.close()

def delete_previous_image(filename):
    from app import app
    if filename:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            os.remove(filepath)

def generate_variation_id():
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
   
def add_variation_to_product(product_id, unit, price, quantity):
    conn = get_db_connection()
    cursor = conn.cursor()
    variation_id = generate_variation_id()
    variation_query = "INSERT INTO product_variation (VariationID, ProductID, Unit, Price, Quantity) VALUES (%s, %s, %s, %s, %s)"
    variation_values = (variation_id, product_id, unit, price, quantity)
    cursor.execute(variation_query, variation_values)
    conn.commit()
    cursor.close()
    conn.close()

def fetch_variation_details(variation_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM product_variation WHERE VariationID = %s", (variation_id,))
    variation = cursor.fetchone()
    cursor.close()
    conn.close()
    return variation

def update_variation(variation_id, unit, price, quantity):
    conn = get_db_connection()
    cursor = conn.cursor()
    update_query = "UPDATE product_variation SET Unit = %s, Price = %s, Quantity = %s WHERE VariationID = %s"
    update_values = (unit, price, quantity, variation_id)
    cursor.execute(update_query, update_values)
    conn.commit()
    cursor.close()
    conn.close()

def delete_variation(variation_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM product_variation WHERE VariationID = %s", (variation_id,))
   
    conn.commit()
    cursor.close()
    conn.close()

@homepage_seller_app.route('/delete_product/<string:product_id>', methods=['POST'])
def delete_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT ImageFilename FROM product WHERE ProductID = %s", (product_id,))
    result = cursor.fetchone()
    if result:
        image_filename = result[0]
    else:
        image_filename = None

    cursor.execute("DELETE FROM product_variation WHERE ProductID = %s", (product_id,))
    cursor.execute("DELETE FROM product WHERE ProductID = %s", (product_id,))
   
    conn.commit()
    cursor.close()
    conn.close()
   
    delete_previous_image(image_filename)

    user_id = session.get('user_id')
    products = fetch_products_for_seller(user_id)
    return render_template('homepage_seller.html', products=products)

@homepage_seller_app.route('/homepage_seller')
def homepage_seller():    
    user_id = session.get('user_id')
    if 'user_id' not in session:
        session['user_id'] = user_id
    print(user_id)
    products = fetch_products_for_seller(user_id)
    return render_template('homepage_seller.html', products=products)

@homepage_seller_app.route('/edit_product/<string:product_id>', methods=['GET', 'POST'])
def edit_product(product_id):
    from app import app
    product = fetch_product_details(product_id)
    variations = fetch_variations_for_product(product_id)
    if request.method == 'GET':
        product = fetch_product_details(product_id)
        variations = fetch_variations_for_product(product_id)
        return render_template('edit_product.html', product=product, variations=variations)
   
    elif request.method == 'POST':
        new_product_name = request.form.get('product_name')
        new_weight = float(request.form.get('weight'))
        new_packaging_length = float(request.form.get('packaging_length'))
        new_packaging_width = float(request.form.get('packaging_width'))
        new_packaging_height = float(request.form.get('packaging_height'))
        new_shipping_fee = request.form.get('shipping_fee')
        new_image_filename = request.files['Image']
        image_filename = None

        if new_image_filename:
            image_filename = secure_filename(new_image_filename.filename)
            new_image_filename.save(os.path.join(app.config['UPLOAD_FOLDER'], image_filename))

        if new_product_name and new_weight and new_packaging_length and new_packaging_width and new_packaging_height:
            product = new_product_name, new_weight, new_packaging_length, new_packaging_width, new_packaging_height, image_filename

        update_product(product_id, new_product_name, new_weight, new_packaging_length, new_packaging_width, new_packaging_height, new_shipping_fee, image_filename)

        existing_variations = request.form.getlist('existing_variations[]')
        existing_units = request.form.getlist('unit[]')
        existing_prices = request.form.getlist('price[]')
        existing_quantities = request.form.getlist('quantity[]')


        for variation_id, unit, price, quantity in zip(existing_variations, existing_units, existing_prices, existing_quantities):
            update_variation(variation_id, unit, price, quantity)

        new_units = request.form.getlist('new_unit[]')
        new_prices = request.form.getlist('new_price[]')
        new_quantities = request.form.getlist('new_quantity[]')

        for unit, price, quantity in zip(new_units, new_prices, new_quantities):
            add_variation_to_product(product_id, unit, price, quantity)
       
        variations = fetch_variations_for_product(product_id)

        for variation in variations:
            delete_button_name = f"delete_variation_button_{variation['VariationID']}"
            if delete_button_name in request.form:
                delete_variation(variation['VariationID'])

        return redirect(url_for('homepage_seller.edit_product', product_id=product_id))
   
    return render_template('edit_product.html', product_id=product_id)

@homepage_seller_app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return redirect('/login')

@homepage_seller_app.route('/seller_account')
def seller_account():
    return render_template('seller_account.html')
@homepage_seller_app.route('/payment_options')
def payment_options():
    return render_template('payment_options.html')

@homepage_seller_app.route('/seller_address')
def seller_address():
    return render_template('seller_address.html')

@homepage_seller_app.route('/edit_product/<string:product_id>')
def variations(product_id):
    variations = fetch_variations_for_product(product_id)
    return render_template('edit_product.html', variations=variations, product_id=product_id)