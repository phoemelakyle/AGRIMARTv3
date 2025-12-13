from flask import Blueprint, render_template, request, redirect, flash, session, url_for, jsonify
import mysql.connector
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import os

load_dotenv()

homepage_seller_app = Blueprint('homepage_seller', __name__)

db_config = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)),
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE"),
    "use_pure": True
}

VOLUMETRIC_FACTOR = 5000
SHIPPING_RATE_PER_UNIT_WEIGHT = 50


def get_db_connection():
    return mysql.connector.connect(**db_config)


def calculate_shipping_fee(weight, length, width, height):
    volumetric_weight = (length * width * height) / VOLUMETRIC_FACTOR
    return max(float(weight), volumetric_weight) * SHIPPING_RATE_PER_UNIT_WEIGHT


# ---------- PRODUCT FETCH & UPDATE ----------

def fetch_products_for_seller(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # fetch products with variations in one go to reduce multiple queries
    cursor.execute("""
        SELECT p.ProductID, p.Product_Name, p.ImageFilename, 
               pv.VariationID, pv.Unit, pv.Status
        FROM product p
        LEFT JOIN product_variation pv ON p.ProductID = pv.ProductID
        WHERE p.SellerID = %s
        ORDER BY p.ProductID
    """, (seller_id,))

    rows = cursor.fetchall()
    products = {}
    for row in rows:
        pid = row['ProductID']
        if pid not in products:
            products[pid] = {
                'ProductID': pid,
                'Product_Name': row['Product_Name'],
                'ImageFilename': row['ImageFilename'],
                'variations': []
            }
        if row['VariationID']:
            products[pid]['variations'].append({'Unit': row['Unit'], 'Status': row['Status'], 'VariationID': row['VariationID']})

    cursor.close()
    conn.close()
    return list(products.values())


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


def update_product(product_id, product_name, weight, length, width, height, shipping_fee, image_filename):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT ImageFilename FROM product WHERE ProductID = %s", (product_id,))
    prev_filename = cursor.fetchone()['ImageFilename']

    shipping_fee = calculate_shipping_fee(weight, length, width, height)

    if image_filename:
        delete_previous_image(prev_filename)
        sql = """UPDATE product 
                 SET Product_Name=%s, Weight=%s, Packaging_Length=%s, Packaging_Width=%s, 
                     Packaging_Height=%s, Shipping_Fee=%s, ImageFilename=%s 
                 WHERE ProductID=%s"""
        values = (product_name, weight, length, width, height, shipping_fee, image_filename, product_id)
    else:
        sql = """UPDATE product 
                 SET Product_Name=%s, Weight=%s, Packaging_Length=%s, Packaging_Width=%s, 
                     Packaging_Height=%s, Shipping_Fee=%s
                 WHERE ProductID=%s"""
        values = (product_name, weight, length, width, height, shipping_fee, product_id)

    cursor.execute(sql, values)
    conn.commit()
    cursor.close()
    conn.close()


def delete_previous_image(filename):
    from app import app
    if filename:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            os.remove(filepath)


# ---------- VARIATION HANDLERS ----------

def generate_variation_id():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(VariationID) FROM product_variation")
    latest = cursor.fetchone()[0]
    new_id = f"VT{int(latest[2:]) + 1}" if latest else "VT1000"
    cursor.close()
    conn.close()
    return new_id


def add_variation_to_product(product_id, unit, price, quantity):
    conn = get_db_connection()
    cursor = conn.cursor()
    variation_id = generate_variation_id()
    cursor.execute("INSERT INTO product_variation (VariationID, ProductID, Unit, Price, Quantity) VALUES (%s,%s,%s,%s,%s)",
                   (variation_id, product_id, unit, price, quantity))
    conn.commit()
    cursor.close()
    conn.close()


def update_variation(variation_id, unit, price, quantity):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE product_variation SET Unit=%s, Price=%s, Quantity=%s WHERE VariationID=%s",
                   (unit, price, quantity, variation_id))
    conn.commit()
    cursor.close()
    conn.close()


def delete_variation(variation_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM product_variation WHERE VariationID=%s", (variation_id,))
    conn.commit()
    cursor.close()
    conn.close()


# ---------- ADDRESS & COUNT ----------

def fetch_address_by_id(address_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM seller_addresses WHERE AddressID=%s", (address_id,))
    address = cursor.fetchone()
    cursor.close()
    conn.close()
    return address


def count_variations_by_status(seller_id, status):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) FROM product_variation pv
        JOIN product p ON pv.ProductID = p.ProductID
        WHERE pv.Status=%s AND p.SellerID=%s
    """, (status, seller_id))
    count = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return count


def count_total_products(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM product WHERE SellerID=%s", (seller_id,))
    count = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return count


# ---------- ROUTES ----------

@homepage_seller_app.route('/homepage_seller')
def homepage_seller():
    user_id = session.get("user_id")
    username = session.get("username")
    if not user_id:
        return redirect('/login')

    products = fetch_products_for_seller(user_id)

    in_stock_count = count_variations_by_status(user_id, 'in-stock')
    restock_count = count_variations_by_status(user_id, 'restock')
    low_stock_count = count_variations_by_status(user_id, 'low-stock')
    total_products = count_total_products(user_id)

    return render_template('homepage_seller.html',
                           products=products,
                           username=username,
                           in_stock_count=in_stock_count,
                           restock_count=restock_count,
                           low_stock_count=low_stock_count,
                           total_products=total_products)


@homepage_seller_app.route('/delete_product/<string:product_id>', methods=['POST'])
def delete_product(product_id):
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ImageFilename FROM product WHERE ProductID=%s", (product_id,))
    image_filename = cursor.fetchone()[0] if cursor.fetchone() else None

    cursor.execute("DELETE FROM product_variation WHERE ProductID=%s", (product_id,))
    cursor.execute("DELETE FROM product WHERE ProductID=%s", (product_id,))
    conn.commit()
    cursor.close()
    conn.close()

    delete_previous_image(image_filename)

    products = fetch_products_for_seller(user_id)
    return render_template('homepage_seller.html', products=products)


@homepage_seller_app.route('/edit_product/<string:product_id>', methods=['GET', 'POST'])
def edit_product(product_id):
    from app import app
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login')

    if request.method == 'GET':
        product = fetch_product_details(product_id)
        variations = fetch_variations_for_product(product_id)
        address = fetch_address_by_id(product['AddressID']) if product.get('AddressID') else None
        return render_template('edit_product.html', product=product, variations=variations, address=address)

    # POST - update product and variations
    product_name = request.form.get('product_name')
    weight = float(request.form.get('weight'))
    length = float(request.form.get('packaging_length'))
    width = float(request.form.get('packaging_width'))
    height = float(request.form.get('packaging_height'))

    image_file = request.files.get('Image')
    image_filename = None
    if image_file and image_file.filename:
        image_filename = secure_filename(image_file.filename)
        image_file.save(os.path.join(app.config['UPLOAD_FOLDER'], image_filename))

    update_product(product_id, product_name, weight, length, width, height, None, image_filename)

    # Update existing variations
    for var_id, unit, price, qty in zip(
            request.form.getlist('existing_variations[]'),
            request.form.getlist('unit[]'),
            request.form.getlist('price[]'),
            request.form.getlist('quantity[]')
    ):
        update_variation(var_id, unit, price, qty)

    # Add new variations
    for unit, price, qty in zip(
            request.form.getlist('new_unit[]'),
            request.form.getlist('new_price[]'),
            request.form.getlist('new_quantity[]')
    ):
        add_variation_to_product(product_id, unit, price, qty)

    # Delete variations if delete button pressed
    variations = fetch_variations_for_product(product_id)
    for variation in variations:
        if f"delete_variation_button_{variation['VariationID']}" in request.form:
            delete_variation(variation['VariationID'])

    return redirect(url_for('homepage_seller.edit_product', product_id=product_id))


@homepage_seller_app.route('/update_product_address/<string:product_id>/<string:address_id>', methods=['POST'])
def update_product_address(product_id, address_id):
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE product SET AddressID=%s WHERE ProductID=%s", (address_id, product_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"success": True})


@homepage_seller_app.route('/check_payment_options')
def check_payment_options():
    seller_id = session.get('user_id')
    if not seller_id:
        return redirect('/login')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT 1 FROM payment_options WHERE SellerID=%s LIMIT 1", (seller_id,))
    has_payment = bool(cursor.fetchone())
    cursor.close()
    conn.close()
    return jsonify({"hasPayment": has_payment})


@homepage_seller_app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect('/login')
