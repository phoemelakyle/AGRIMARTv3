from flask import Blueprint, render_template, request, redirect, flash, session, url_for
import mysql.connector
from datetime import datetime
import os

seller_orders_app = Blueprint('seller_orders', __name__)

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

def get_unpaid_orders_data(user_id, sort='recent'):
    order_details = []

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            if sort == 'old':
                order_by = 'ASC'
            else:
                order_by = 'DESC'

            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Order_Date
            FROM seller_order
            WHERE Order_Status = 'waiting for payment' AND SellerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                order_date = order['Order_Date']

                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()

                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()

                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)

            print(sort)
            print("ORDER BY:", order_by)
            print("Final Query:", query_orders)

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    return order_details

@seller_orders_app.route('/unpaid_orders', methods=['POST','GET'])
def unpaid_orders():
    user_id = session.get('user_id')
    sort = request.args.get('sort', 'recent')
    order_details = get_unpaid_orders_data(user_id, sort)

    order_type = 'unpaid'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

def get_to_ship_orders_data(user_id, sort='recent'):
    order_details = []

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            if sort == 'old':
                order_by = 'ASC'
            else:
                order_by = 'DESC'

            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Order_Date
            FROM seller_order
            WHERE Order_Status = 'pending' AND SellerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                order_date = order['Order_Date']

                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()

                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()

                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    return order_details

@seller_orders_app.route('/to_ship_orders', methods=['POST','GET'])
def to_ship_orders():
    user_id = session.get('user_id')
    sort = request.args.get('sort', 'recent')
    order_details = get_to_ship_orders_data(user_id, sort)

    order_type = 'to_ship'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/shipping_orders', methods=['POST','GET'])
def shipping_orders():
    user_id = session.get('user_id')
    order_details = []  
    sort = request.args.get('sort', 'recent')

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            order_by = 'ASC' if sort == 'old' else 'DESC'

            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Shipping_Date, Order_Date
            FROM seller_order
            WHERE Order_Status = 'shipping' AND SellerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                order_date = order['Order_Date']

                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()

                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()

                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Shipping_Date': order['Shipping_Date'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    order_type = 'shipping'  
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/delivered_orders', methods=['POST','GET'])
def delivered_orders():
    user_id = session.get('user_id')
    order_details = []  
    sort = request.args.get('sort', 'recent')

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            order_by = 'ASC' if sort == 'old' else 'DESC'

            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Shipping_Date, Order_Date
            FROM seller_order
            WHERE Order_Status = 'delivered' AND SellerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                order_date = order['Order_Date']

                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()

                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()

                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Shipping_Date': order['Shipping_Date'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    order_type = 'delivered'  
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/cancelled_orders', methods=['POST','GET'])
def cancelled_orders():
    user_id = session.get('user_id')
    order_details = []  
    sort = request.args.get('sort', 'recent')

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)

            order_by = 'ASC' if sort == 'old' else 'DESC'

            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Order_Date
            FROM seller_order
            WHERE Order_Status = 'cancelled' AND SellerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                order_date = order['Order_Date']

                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()

                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()

                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    order_type = 'cancelled'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/ship_now/<order_id>', methods=['POST', 'GET'])
def ship_now(order_id):
    user_id = session.get('user_id')
   
    order_details = get_to_ship_orders_data(user_id)

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            current_datetime = datetime.now()
            formatted_date = current_datetime.strftime('%Y-%m-%d')

            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'shipping', Shipping_Date = %s
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (formatted_date, order_id))
            connection.commit()

            update_query = """
            UPDATE seller_order
            SET Order_Status = 'shipping', Shipping_Date = %s
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (formatted_date, order_id))
            connection.commit()

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    order_type = 'to_ship'

    return render_template('seller_orders.html', order_details=order_details, order_type=order_type, refresh_page=True)

@seller_orders_app.route('/cancel_unpaid_order/<order_id>', methods=['POST', 'GET'])
def cancel_unpaid_order(order_id):
    user_id = session.get('user_id')
   
    order_details = get_unpaid_orders_data(user_id)

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()

            update_query = """
            UPDATE seller_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()

            get_variation_id_query = "SELECT VariationID FROM seller_order WHERE OrderID = %s"
            cursor.execute(get_variation_id_query, (order_id,))
            variation_id = cursor.fetchone()[0]

            seller_order_quantity_query = "SELECT Quantity FROM seller_order WHERE OrderID = %s"
            cursor.execute(seller_order_quantity_query, (order_id,))
            sl_quantity = cursor.fetchone()[0]
            print(sl_quantity)

            product_variation_quantity_query = "SELECT Quantity FROM product_variation WHERE VariationID = %s"
            cursor.execute(product_variation_quantity_query, (variation_id,))      
            pv_quantity = cursor.fetchone()[0]
            print(pv_quantity)

            new_quantity = max(pv_quantity + sl_quantity, 0)
            print(new_quantity)

            update_query = "UPDATE product_variation SET Quantity = %s WHERE VariationID = %s"
            cursor.execute(update_query, (new_quantity, variation_id))
            connection.commit()

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    order_type = 'unpaid'

    return redirect(url_for('seller_orders.unpaid_orders'))

@seller_orders_app.route('/cancel_to_ship_order/<order_id>', methods=['POST', 'GET'])
def cancel_to_ship_order(order_id):
    user_id = session.get('user_id')
   
    order_details = get_to_ship_orders_data(user_id)

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()

            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()

            update_query = """
            UPDATE seller_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()

            get_variation_id_query = "SELECT VariationID FROM seller_order WHERE OrderID = %s"
            cursor.execute(get_variation_id_query, (order_id,))
            variation_id = cursor.fetchone()[0]

            seller_order_quantity_query = "SELECT Quantity FROM seller_order WHERE OrderID = %s"
            cursor.execute(seller_order_quantity_query, (order_id,))
            sl_quantity = cursor.fetchone()[0]
            print(sl_quantity)

            product_variation_quantity_query = "SELECT Quantity FROM product_variation WHERE VariationID = %s"
            cursor.execute(product_variation_quantity_query, (variation_id,))      
            pv_quantity = cursor.fetchone()[0]
            print(pv_quantity)

            new_quantity = max(pv_quantity + sl_quantity, 0)
            print(new_quantity)

            update_query = "UPDATE product_variation SET Quantity = %s WHERE VariationID = %s"
            cursor.execute(update_query, (new_quantity, variation_id))
            connection.commit()

    except mysql.connector.Error as err:
        print(f"Error: {err}")

    order_type = 'to_ship'

    return redirect(url_for('seller_orders.to_ship_orders'))