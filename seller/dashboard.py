from flask import Blueprint, render_template, request, redirect, flash, session, url_for, jsonify
from datetime import datetime, timedelta
import mysql.connector
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import os

load_dotenv()

dashboard_app = Blueprint('dashboard', __name__)

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

def calculate_total_revenue(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT so.Quantity, pv.Price
        FROM seller_order so
        JOIN product_variation pv ON so.VariationID = pv.VariationID
        JOIN product p ON pv.ProductID = p.ProductID
        WHERE so.SellerID = %s AND so.Order_Status = 'delivered'
    """
    cursor.execute(query, (seller_id,))
    rows = cursor.fetchall()

    total_revenue = sum(quantity * float(price) for quantity, price in rows)

    cursor.close()
    conn.close()
    return total_revenue

def count_sold_variations(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT COUNT(DISTINCT VariationID)
        FROM seller_order
        WHERE SellerID = %s AND Order_Status = 'delivered'
    """
    cursor.execute(query, (seller_id,))
    total_sold_variations = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return total_sold_variations

def count_delivered_orders(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT COUNT(*)
        FROM seller_order
        WHERE SellerID = %s AND Order_Status = 'delivered'
    """
    cursor.execute(query, (seller_id,))
    count = cursor.fetchone()[0]

    cursor.close()
    conn.close()
    return count

def calculate_aov(total_revenue, total_orders):
    if total_orders == 0:
        return 0
    return total_revenue / total_orders

def count_pending_payments(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT COUNT(*)
        FROM seller_order
        WHERE SellerID = %s AND Order_Status = 'waiting for payment'
    """
    cursor.execute(query, (seller_id,))
    count = cursor.fetchone()[0]

    cursor.close()
    conn.close()
    return count

def count_to_ship_orders(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT COUNT(*)
        FROM seller_order
        WHERE SellerID = %s AND Order_Status = 'pending'
    """
    cursor.execute(query, (seller_id,))
    count = cursor.fetchone()[0]

    cursor.close()
    conn.close()
    return count

def count_shipping_orders(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT COUNT(*)
        FROM seller_order
        WHERE SellerID = %s AND Order_Status = 'shipping'
    """
    cursor.execute(query, (seller_id,))
    count = cursor.fetchone()[0]

    cursor.close()
    conn.close()
    return count

def count_cancelled_orders(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT COUNT(*)
        FROM seller_order
        WHERE SellerID = %s AND Order_Status = 'cancelled'
    """
    cursor.execute(query, (seller_id,))
    count = cursor.fetchone()[0]

    cursor.close()
    conn.close()
    return count

def get_top_performing_variations(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            pv.VariationID,
            pv.Unit,
            p.Product_Name,
            p.ImageFilename,
            SUM(so.Quantity) AS total_sold,
            SUM(so.Quantity * pv.Price) AS revenue
        FROM seller_order so
        JOIN product_variation pv ON so.VariationID = pv.VariationID
        JOIN product p ON pv.ProductID = p.ProductID
        WHERE so.SellerID = %s
          AND so.Order_Status = 'delivered'
        GROUP BY pv.VariationID, pv.Unit, p.Product_Name, p.ImageFilename, pv.Price
        ORDER BY total_sold DESC
        LIMIT 5;
    """

    cursor.execute(query, (seller_id,))
    results = cursor.fetchall()

    cursor.close()
    conn.close()

    return results

def get_top_selling_product_units():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            p.Product_Name,
            pv.Unit,
            SUM(so.Quantity) AS total_sold
        FROM seller_order so
        JOIN product_variation pv ON so.VariationID = pv.VariationID
        JOIN product p ON pv.ProductID = p.ProductID
        WHERE so.Order_Status = 'delivered'
        GROUP BY p.Product_Name, pv.Unit
        ORDER BY total_sold DESC
        LIMIT 5;
    """

    cursor.execute(query)
    results = cursor.fetchall()

    cursor.close()
    conn.close()

    return results

from datetime import datetime, timedelta

def get_last_7_days_sales(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    today = datetime.now().date()
    last_7_days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    sales_dict = {day.strftime('%m-%d'): 0 for day in last_7_days}  # Use MM-DD format

    query = """
        SELECT DATE(Order_Date) as order_day, SUM(so.Quantity * pv.Price) as revenue
        FROM seller_order so
        JOIN product_variation pv ON so.VariationID = pv.VariationID
        WHERE so.SellerID = %s AND so.Order_Status = 'delivered'
          AND DATE(Order_Date) >= %s
        GROUP BY DATE(Order_Date)
    """
    cursor.execute(query, (seller_id, last_7_days[0].strftime('%Y-%m-%d')))
    rows = cursor.fetchall()

    for order_day, revenue in rows:
        sales_dict[order_day.strftime('%m-%d')] = float(revenue)

    cursor.close()
    conn.close()
    return sales_dict


def get_last_30_days_sales(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    today = datetime.now().date()
    last_30_days = [(today - timedelta(days=i)) for i in range(29, -1, -1)]
    sales_dict = {day.strftime('%m-%d'): 0 for day in last_30_days}  # Use MM-DD format

    query = """
        SELECT DATE(Order_Date) as order_day, SUM(so.Quantity * pv.Price) as revenue
        FROM seller_order so
        JOIN product_variation pv ON so.VariationID = pv.VariationID
        WHERE so.SellerID = %s AND so.Order_Status = 'delivered'
          AND DATE(Order_Date) >= %s
        GROUP BY DATE(Order_Date)
    """
    cursor.execute(query, (seller_id, last_30_days[0].strftime('%Y-%m-%d')))
    rows = cursor.fetchall()

    for order_day, revenue in rows:
        sales_dict[order_day.strftime('%m-%d')] = float(revenue)

    cursor.close()
    conn.close()
    return sales_dict


@dashboard_app.route('/dashboard')
def dashboard():
    user_id = session.get("user_id")
    username = session.get("username")
    if not user_id:
        return redirect('/login')

    total_revenue = calculate_total_revenue(user_id)
    total_sold_variations = count_sold_variations(user_id)
    total_delivered_orders = count_delivered_orders(user_id)
    pending_payments = count_pending_payments(user_id)
    to_ship = count_to_ship_orders(user_id)
    shipping = count_shipping_orders(user_id)
    cancelled = count_cancelled_orders(user_id)
    top_products = get_top_performing_variations(user_id)
    sales_last_7_days = get_last_7_days_sales(user_id)
    sales_last_30_days = get_last_30_days_sales(user_id)
    market_top_products = get_top_selling_product_units()

    average_order_value = calculate_aov(total_revenue, total_delivered_orders)

    return render_template(
        'dashboard.html',
        username=username,
        total_revenue=total_revenue,
        total_sold_variations=total_sold_variations,
        total_delivered_orders=total_delivered_orders,
        average_order_value=average_order_value,
        pending_payments=pending_payments,
        to_ship=to_ship,
        shipping=shipping,
        cancelled=cancelled,
        top_products=top_products,
        sales_last_7_days=sales_last_7_days,
        sales_last_30_days=sales_last_30_days,
        market_top_products=market_top_products
    )

@dashboard_app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return redirect('/login')