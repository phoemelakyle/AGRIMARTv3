from flask import Blueprint, request, render_template, redirect, session
import mysql.connector
from flask import jsonify
from dotenv import load_dotenv
import os

load_dotenv()

viewproduct_app = Blueprint('viewproduct', __name__)

db_config = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)), 
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE"),
    "use_pure": True                          
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

@viewproduct_app.route('/viewproduct/<string:product_id>')
def viewproduct(product_id):
    with get_db_connection() as connection:
        cursor = connection.cursor(dictionary=True)

        print("Product IDviewproductapp:")
        print(product_id)

        query = f"""
        SELECT p.ProductID, p.Product_Name, p.CategoryID, pv.Price, p.ImageFileName, pv.Unit, pv.Quantity
        FROM product p
        JOIN product_variation pv ON p.ProductID = pv.ProductID
        WHERE p.ProductID = '{product_id}'
        """
        cursor.execute(query)
        product_data = cursor.fetchall()

        if not product_data:
            return "Product not found", 404

        units_query = f"""
        SELECT DISTINCT Unit
        FROM product_variation
        WHERE ProductID = '{product_id}'
        """
        cursor.execute(units_query)
        units = [row['Unit'] for row in cursor.fetchall()]

        quantities_query = f"""
        SELECT DISTINCT Quantity
        FROM product_variation
        WHERE ProductID = '{product_id}'
        """
        cursor.execute(quantities_query)
        quantities = [row['Quantity'] for row in cursor.fetchall()]

        prices_query = f"""
        SELECT DISTINCT Price
        FROM product_variation
        WHERE ProductID = '{product_id}'
        """
        cursor.execute(prices_query)
        prices = [row['Price'] for row in cursor.fetchall()]
   
        grouped_products = {}
        for product in product_data:
            key = (product['ProductID'], product['Product_Name'])
            if key not in grouped_products:
                grouped_products[key] = {'ProductID': product['ProductID'],
                                         'CategoryID': product['CategoryID'],
                                         'Product_Name': product['Product_Name'],
                                         'ImageFileName': product['ImageFileName'],
                                         'Prices': prices,
                                         'Units': units,
                                         'Quantities': quantities}
            else:
                if product['Price'] not in grouped_products[key]['Prices']:
                    grouped_products[key]['Prices'].append(product['Price'])

        grouped_product_data = list(grouped_products.values())
        category_query = "SELECT CategoryID, Category_Name FROM product_category"
        cursor.execute(category_query)
        categories = cursor.fetchall()

        category_name_query = f"""
        SELECT Category_Name
        FROM product_category
        WHERE CategoryID = '{product['CategoryID']}'
        """
        cursor.execute(category_name_query)
        category_name = cursor.fetchone()

        return render_template('viewproduct.html', product_data=grouped_product_data, categories=categories, category_name=category_name)

@viewproduct_app.route('/api/view-product-variation', methods=['POST'])
def viewprovar():
    data = request.json
    selected_unit = data.get('unit')
    product_id = data.get('product_id')
    print("product_id")
    print(product_id)
    print("unit:", selected_unit)
    print("Raw data:", request.data)
    print("Parsed JSON:", data)

    query = f"SELECT Price, Quantity FROM product_variation WHERE Unit = '{selected_unit}' AND ProductID = '{product_id}'"
   
    with get_db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query)
        result = cursor.fetchone()

    response = {
    'unit': selected_unit,
    'price': result[0] if result else None,
    'quantity': result[1] if result else None
    }

    return jsonify(response)

@viewproduct_app.route('/add-to-cart-quan', methods=['GET', 'POST'])
def add_to_cart_quan():
    user_id = session.get('user_id')
    if 'user_id' not in session:
        session['user_id'] = user_id

    data = request.get_json()
    product_id = data.get('productID')
    cart_quantity = data.get('newQuantity')
    variation_id = data.get('variationID')

    connection = get_db_connection()
    if connection:
        try:
            cursor = connection.cursor(dictionary=True)
            query = f"SELECT Product_Name, ImageFileName FROM product WHERE ProductID = '{product_id}'"
            cursor.execute(query)
            product_info = cursor.fetchone()

            if product_info:
                product_name = product_info['Product_Name']
                image_filename = product_info['ImageFileName']

                insert_into_cart()

                response_data = {
                    'status': 'success',
                    'user': user_id,
                    'productID': product_id,
                    'newQuantity': cart_quantity,
                    'productName': product_name,
                    'imageFilename': image_filename
                }
            else:
                response_data = {'status': 'error', 'message': 'Product not found.'}
   
        except mysql.connector.Error as err:
            print(f"Error: {err}")
            response_data = {'status': 'error', 'message': 'Error executing SQL query.'}

        finally:
            cursor.close()
            connection.close()

    else:
        response_data = {'status': 'error', 'message': 'Error connecting to the database.'}

    return jsonify(response_data)

@viewproduct_app.route('/api/pro-var-unit', methods=['GET','POST'])
def view_product_variation():
    data = request.get_json()
    unit_var = data.get('unit')
    product_id = data.get('product_id')

    print(unit_var)
   
    connection = get_db_connection()

    if connection:
        try:
            cursor = connection.cursor(dictionary=True)
            query = f"SELECT VariationID FROM product_variation WHERE Unit = '{unit_var}' AND ProductID ='{product_id}'"
            cursor.execute(query)
            product_variation_info = cursor.fetchone()
            print(product_variation_info)
            if product_variation_info:
                variation_id = product_variation_info['VariationID']

                response_data = {
                    'status': 'success',
                    'VariationID': variation_id
                }
            else:
                response_data = {'status': 'error', 'message': 'Product variation not found.'}

        except mysql.connector.Error as err:
            print(f"Error: {err}")
            response_data = {'status': 'error', 'message': 'Error executing SQL query.'}

        finally:
            cursor.close()
            connection.close()

    else:
        response_data = {'status': 'error', 'message': 'Error connecting to the database.'}

    return jsonify(response_data)

@viewproduct_app.route('/generate_cart_id')
def generate_cart_id():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT MAX(CartID) FROM cart")
    latest_cart_id = cursor.fetchone()[0]

    if latest_cart_id is not None:
        numeric_part = int(latest_cart_id[2:])
        new_numeric_part = numeric_part + 1
    else:
        new_numeric_part = 1000

    cart_id = f"CT{new_numeric_part}"
    cursor.close()
    conn.close()

    return cart_id

@viewproduct_app.route('/api/insert-into-cart', methods=['POST'])
def insert_into_cart():
    data = request.get_json()
    user_id = session.get('user_id')
    product_id = data.get('productID')
    cart_quantity = data.get('newQuantity')
    variation_id = data.get('variationID')

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            query_check = """
            SELECT Cart_Quantity FROM cart
            WHERE BuyerID = %s AND ProductID = %s AND VariationID = %s
            """
            cursor.execute(query_check, (user_id, product_id, variation_id))
            existing_row = cursor.fetchone()

            if existing_row:
             
                existing_quantity = int(existing_row['Cart_Quantity'])
                new_quantity = existing_quantity + cart_quantity

                max_quantity_query = """
                SELECT Quantity FROM product_variation
                WHERE ProductID = %s AND VariationID = %s
                """
                cursor.execute(max_quantity_query, (product_id, variation_id))
                max_quantity_row = cursor.fetchone()

                if max_quantity_row:
                    max_quantity = int(max_quantity_row['Quantity'])
                    new_quantity = min(new_quantity, max_quantity)

                query_update = """
                UPDATE cart
                SET Cart_Quantity = %s
                WHERE BuyerID = %s AND ProductID = %s AND VariationID = %s
                """
                cursor.execute(query_update, (new_quantity, user_id, product_id, variation_id))
                connection.commit()
                response_data = {'status': 'success', 'message': 'Cart item updated successfully'}
            else:
                cart_id = generate_cart_id()

                max_quantity_query = """
                SELECT Quantity FROM product_variation
                WHERE ProductID = %s AND VariationID = %s
                """
                cursor.execute(max_quantity_query, (product_id, variation_id))
                max_quantity_row = cursor.fetchone()

                if max_quantity_row:
                    max_quantity = int(max_quantity_row['Quantity'])
                    cart_quantity = min(cart_quantity, max_quantity)

                query_insert = """
                INSERT INTO cart (CartID, BuyerID, ProductID, VariationID, Cart_Quantity)
                VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(query_insert, (cart_id, user_id, product_id, variation_id, cart_quantity))
                connection.commit()
                response_data = {'status': 'success', 'message': 'Cart item added successfully'}

    except mysql.connector.Error as err:
        print(f"Error: {err}")
        response_data = {'status': 'error', 'message': 'Error executing SQL query.'}
       
    finally:
        cursor.close()

    return jsonify(response_data)