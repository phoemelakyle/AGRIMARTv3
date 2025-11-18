from flask import Blueprint, render_template, request, redirect, flash, session, url_for
import mysql.connector
from datetime import datetime
import os

seller_account_app = Blueprint('seller_account', __name__)

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

@seller_account_app.route('/seller_account', methods=['GET', 'POST'])
def seller_account():
    seller_id = session.get('SellerID')

    if not seller_id:
        return redirect('/login')  

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')

        # Update seller table
        update_query = """
            UPDATE seller
            SET Username=%s, Name=%s, Email=%s, Phone_Number=%s
            WHERE SellerID=%s
        """
        cursor.execute(update_query, (username, name, email, phone, seller_id))
        conn.commit()
        flash('Profile updated successfully!', 'success')

    # Fetch current seller info
    cursor.execute("""
        SELECT SellerID, Name, Email, Phone_Number, Username
        FROM seller
        WHERE SellerID = %s
    """, (seller_id,))
    seller = cursor.fetchone()

    cursor.close()
    conn.close()

    return render_template('seller_account.html', seller=seller)
