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
    key = os.getenv("GOOGLE_MAPS_API_KEY").strip()

    addresses = []
    if seller_id:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM seller_addresses WHERE SellerID = %s", (seller_id,))
        addresses = cursor.fetchall()
        cursor.close()
        conn.close()

    return render_template(
        "seller_address.html",
        google_maps_api_key=key,
        addresses=addresses
    )

@seller_address_app.route('/save_seller_address', methods=['POST'])
def save_seller_address():
    # Get seller ID from session 
    seller_id = session.get('SellerID')
    if not seller_id:
        flash("You must be logged in.")
        return redirect(url_for('seller_address.seller_address'))

    address_id = request.form.get('address_id')
    full_name = request.form['full_name']
    phone_number = request.form['phone_number']
    street = request.form['street']
    province = request.form['province']
    region = request.form['region']
    zip_code = request.form['zip_code']
    latitude = float(request.form['latitude'])
    longitude = float(request.form['longitude'])

    conn = get_db_connection()
    cursor = conn.cursor()
    if address_id and address_id.strip() != "":
        update_query = """
            UPDATE seller_addresses
            SET Full_Name=%s,
                Phone_Number=%s,
                Street=%s,
                Province=%s,
                Region=%s,
                Zip_Code=%s,
                Latitude=%s,
                Longitude=%s
            WHERE AddressID=%s AND SellerID=%s
        """
        cursor.execute(update_query, (full_name, phone_number, street, province,
                                      region, zip_code, latitude, longitude,
                                      address_id, seller_id))
        conn.commit()
        cursor.close()
        conn.close()

        flash("Address updated successfully!")
        return redirect(url_for('seller_address.seller_address'))

    cursor.execute("SELECT MAX(AddressID) FROM seller_addresses")
    last_id = cursor.fetchone()[0]
    if last_id:
        new_id = f"SA{int(last_id[2:]) + 1:04d}"
    else:
        new_id = "SA1000"

    # Insert into DB
    insert_query = """
        INSERT INTO seller_addresses
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

@seller_address_app.route('/delete_seller_address/<address_id>')
def delete_seller_address(address_id):
    seller_id = session.get('SellerID')
    if not seller_id:
        flash("You must be logged in.")
        return redirect(url_for('seller_address.seller_address'))

    conn = get_db_connection()
    cursor = conn.cursor()

    query = "DELETE FROM seller_addresses WHERE AddressID = %s AND SellerID = %s"
    cursor.execute(query, (address_id, seller_id))
    conn.commit()

    cursor.close()
    conn.close()

    flash("Address deleted successfully!")
    return redirect(url_for('seller_address.seller_address'))
