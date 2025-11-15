from flask import Blueprint, render_template, request, redirect, flash, session, url_for
import mysql.connector
from datetime import datetime
import os

seller_address_app = Blueprint('seller_address', __name__)

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

@seller_address_app.route('/seller_address')
def seller_address():
    seller_id = session.get('SellerID')
    print(seller_id)
    key = os.getenv("GOOGLE_MAPS_API_KEY").strip()

    addresses = []
    if seller_id:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM addresses WHERE SellerID = %s", (seller_id,))
        addresses = cursor.fetchall()
        cursor.close()
        conn.close()

    return render_template(
        "seller_address.html",
        google_maps_api_key=key,
        addresses=addresses
    )

@seller_address_app.route('/save_address', methods=['POST'])
def save_address():
    # Get seller ID from session 
    seller_id = session.get('SellerID')
    if not seller_id:
        flash("You must be logged in.")
        return redirect(url_for('seller_address.seller_address'))

    full_name = request.form['full_name']
    phone_number = request.form['phone_number']
    street = request.form['street']
    province = request.form['province']
    region = request.form['region']
    zip_code = request.form['zip_code']
    latitude = request.form['latitude']
    longitude = request.form['longitude']

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(AddressID) FROM addresses")
    last_id = cursor.fetchone()[0]
    if last_id:
        new_id = f"AD{int(last_id[2:]) + 1:04d}"
    else:
        new_id = "AD1000"

    # Insert into DB
    insert_query = """
        INSERT INTO addresses
        (AddressID, SellerID, Full_Name, Phone_Number, Street, Province, Region, Zip_Code, Latitude, Longitude)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(insert_query, (new_id, seller_id, full_name, phone_number, street,
                                  province, region, zip_code, latitude, longitude))
    conn.commit()
    cursor.close()
    conn.close()

    flash("Address saved successfully!")
    return redirect(url_for('seller_address.seller_address'))
