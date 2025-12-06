from flask import Blueprint, render_template, request, redirect, session, url_for, jsonify
import mysql.connector
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

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

ORDER_STATUS_MAP = {
    'unpaid': 'waiting for payment',
    'to_ship': 'pending',
    'shipping': 'shipping',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
}

def get_orders_by_status(user_id, status_key, sort='recent'):
    if status_key not in ORDER_STATUS_MAP:
        return []
    order_status = ORDER_STATUS_MAP[status_key]
    order_details = []
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            order_by = 'ASC' if sort == 'old' else 'DESC'
            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Date, AddressID
            FROM seller_order
            WHERE Order_Status = %s AND SellerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (order_status, user_id))
            orders = cursor.fetchall()
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                address_id = order.get('AddressID')
                payment_optionsid = order.get('Payment_OptionsID')

                cursor.execute(
                    """
                    SELECT Product_Name, ImageFileName, Shipping_Fee
                    FROM product
                    WHERE ProductID = %s
                    """,
                    (product_id,),
                )
                product_info = cursor.fetchone()

                cursor.execute(
                    """
                    SELECT Unit, Price
                    FROM product_variation
                    WHERE VariationID = %s
                    """,
                    (variation_id,),
                )
                variation_info = cursor.fetchone()

                buyer_address = ''
                if address_id:
                    cursor.execute(
                        """
                        SELECT Full_Name, Phone_Number, Street, Municipality, Province, Zip_Code
                        FROM buyer_addresses
                        WHERE AddressID = %s
                        """,
                        (address_id,),
                    )
                    addr = cursor.fetchone()
                    if addr:
                        buyer_address = f"{addr['Full_Name']}, {addr['Phone_Number']}, {addr['Street']}, {addr['Municipality']}, {addr['Province']} {addr['Zip_Code']}"

                payment_opt = ''
                if payment_optionsid:
                    cursor.execute(
                        """
                        SELECT Payment_Method, Account_Number
                        FROM buyer_payment_options
                        WHERE Payment_OptionsID = %s
                        """,
                        (payment_optionsid,),
                    )
                    payment = cursor.fetchone()
                    if payment:
                        payment_opt = f"{payment['Payment_Method']}, {payment['Account_Number']}"

                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Order_Date': order['Order_Date'],
                    'Shipping_Date': order.get('Shipping_Date'),
                    'Buyer_Address': buyer_address,
                    'Payment_Option': payment_opt,
                    'Order_Status': status_key,
                }
                order_details.append(order_detail)
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    return order_details

def get_unpaid_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'unpaid', sort)

def get_to_ship_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'to_ship', sort)

def get_shipping_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'shipping', sort)

def get_delivered_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'delivered', sort)

def get_cancelled_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'cancelled', sort)

def ship_order(order_id):
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            current_date = datetime.now().strftime('%Y-%m-%d')
            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'shipping', Shipping_Date = %s
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (current_date, order_id))
            update_query = """
            UPDATE seller_order
            SET Order_Status = 'shipping', Shipping_Date = %s
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (current_date, order_id))
            connection.commit()
        return True
    except mysql.connector.Error as err:
        print(f"Error shipping order: {err}")
        return False

def cancel_order(order_id):
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            update_query = """
            UPDATE seller_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()

            cursor.execute("SELECT VariationID, Quantity FROM seller_order WHERE OrderID = %s", (order_id,))
            variation_info = cursor.fetchone()
            if variation_info:
                variation_id, sl_quantity = variation_info
                cursor.execute("SELECT Quantity FROM product_variation WHERE VariationID = %s", (variation_id,))
                pv_quantity = cursor.fetchone()[0]
                new_quantity = max(pv_quantity + sl_quantity, 0)
                cursor.execute("UPDATE product_variation SET Quantity = %s WHERE VariationID = %s", (new_quantity, variation_id))
                connection.commit()
        return True
    except mysql.connector.Error as err:
        print(f"Error cancelling order: {err}")
        return False

@seller_orders_app.route('/unpaid_orders', methods=['POST','GET'])
def unpaid_orders():
    user_id = session.get('user_id')
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_unpaid_orders_data(user_id, sort)

    order_type = 'unpaid'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/to_ship_orders', methods=['POST','GET'])
def to_ship_orders():
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_to_ship_orders_data(user_id, sort)

    order_type = 'to_ship'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/shipping_orders', methods=['POST','GET'])
def shipping_orders():
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_shipping_orders_data(user_id, sort)
    order_type = 'shipping'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/delivered_orders', methods=['POST','GET'])
def delivered_orders():
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_delivered_orders_data(user_id, sort)
    order_type = 'delivered'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/cancelled_orders', methods=['POST','GET'])
def cancelled_orders():
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_cancelled_orders_data(user_id, sort)
    order_type = 'cancelled'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/ship_now/<order_id>', methods=['POST', 'GET'])
def ship_now(order_id):
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    
    ship_order(order_id)
    order_details = get_to_ship_orders_data(user_id)
    order_type = 'to_ship'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type, refresh_page=True)

@seller_orders_app.route('/cancel_unpaid_order/<order_id>', methods=['POST', 'GET'])
def cancel_unpaid_order(order_id):
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    cancel_order(order_id)
    return redirect(url_for('seller_orders.unpaid_orders'))

@seller_orders_app.route('/cancel_to_ship_order/<order_id>', methods=['POST', 'GET'])
def cancel_to_ship_order(order_id):
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    cancel_order(order_id)
    return redirect(url_for('seller_orders.to_ship_orders'))


@seller_orders_app.route('/api/seller_orders', methods=['GET'])
def api_seller_orders():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    status = request.args.get('status', 'unpaid')
    sort = request.args.get('sort', 'recent')
    order_details = get_orders_by_status(user_id, status, sort)
    return jsonify({'success': True, 'orders': order_details})


@seller_orders_app.route('/api/seller_orders/<order_id>/ship', methods=['POST'])
def api_ship_order(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    success = ship_order(order_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Unable to ship order.'}), 500


@seller_orders_app.route('/api/seller_orders/<order_id>/cancel', methods=['POST'])
def api_cancel_order(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    success = cancel_order(order_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Unable to cancel order.'}), 500