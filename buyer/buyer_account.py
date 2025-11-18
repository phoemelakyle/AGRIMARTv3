from flask import Blueprint, render_template, request, redirect, flash, session, url_for
import mysql.connector
from datetime import datetime
import os

buyer_account_app = Blueprint('buyer_account', __name__)

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

@buyer_account_app.route('/buyer_account', methods=['GET', 'POST'])
def buyer_account():
    buyer_id = session.get('BuyerID')

    if not buyer_id:
        return redirect('/login')  

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')

        # Update buyer table
        update_query = """
            UPDATE buyer
            SET Username=%s, Name=%s, Email=%s, Phone_Number=%s
            WHERE BuyerID=%s
        """
        cursor.execute(update_query, (username, name, email, phone, buyer_id))
        conn.commit()
        flash('Profile updated successfully!', 'success')

    # Fetch current buyer info
    cursor.execute("""
        SELECT BuyerID, Name, Email, Phone_Number, Username
        FROM buyer
        WHERE BuyerID = %s
    """, (buyer_id,))
    buyer = cursor.fetchone()

    cursor.close()
    conn.close()

    return render_template('account.html', buyer=buyer)
