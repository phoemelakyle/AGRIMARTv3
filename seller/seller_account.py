from flask import Blueprint, render_template, request, redirect, flash, session, url_for, jsonify
import mysql.connector
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

def fetch_seller_profile(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT SellerID, Name, Email, Phone_Number, Username
        FROM seller
        WHERE SellerID = %s
        """,
        (seller_id,),
    )
    seller = cursor.fetchone()
    cursor.close()
    conn.close()
    return seller

def update_seller_profile(seller_id, username, name, email, phone):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE seller
        SET Username=%s, Name=%s, Email=%s, Phone_Number=%s
        WHERE SellerID=%s
        """,
        (username, name, email, phone, seller_id),
    )
    conn.commit()
    cursor.close()
    conn.close()

@seller_account_app.route('/seller_account', methods=['GET', 'POST'])
def seller_account():
    seller_id = session.get('SellerID')

    if not seller_id:
        return redirect('/login')  

    if request.method == 'POST':
        username = request.form.get('username')
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        update_seller_profile(seller_id, username, name, email, phone)
        flash('Profile updated successfully!', 'success')

    seller = fetch_seller_profile(seller_id)
    return render_template('seller_account.html', seller=seller)


@seller_account_app.route('/api/seller_account', methods=['GET'])
def get_seller_account():
    seller_id = session.get('SellerID')
    if not seller_id:
        return jsonify({'ok': False, 'message': 'Authentication required'}), 401
    seller = fetch_seller_profile(seller_id)
    if not seller:
        return jsonify({'ok': False, 'message': 'Seller not found'}), 404
    return jsonify({'ok': True, 'seller': seller})


@seller_account_app.route('/api/seller_account', methods=['PATCH'])
def patch_seller_account():
    seller_id = session.get('SellerID')
    if not seller_id:
        return jsonify({'ok': False, 'message': 'Authentication required'}), 401
    seller = fetch_seller_profile(seller_id)
    if not seller:
        return jsonify({'ok': False, 'message': 'Seller not found'}), 404
    data = request.get_json() or {}
    username = data.get('username', seller['Username'])
    name = data.get('name', seller['Name'])
    email = data.get('email', seller['Email'])
    phone = data.get('phone', seller['Phone_Number'])
    update_seller_profile(seller_id, username, name, email, phone)
    updated = fetch_seller_profile(seller_id)
    return jsonify({'ok': True, 'seller': updated})
