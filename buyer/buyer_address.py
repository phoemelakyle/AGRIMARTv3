from flask import Blueprint, render_template, request, redirect, flash, session, url_for
import mysql.connector
from datetime import datetime
import os

buyer_address_app = Blueprint('buyer_address', __name__)

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

@buyer_address_app.route('/buyer_address')
def buyer_address():
    buyer_id = session.get('BuyerID')
    key = os.getenv("GOOGLE_MAPS_API_KEY").strip()

    addresses = []
    if buyer_id:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM buyer_addresses WHERE BuyerID = %s", (buyer_id,))
        addresses = cursor.fetchall()
        cursor.close()
        conn.close()

    return render_template(
        "buyer_address.html",
        google_maps_api_key=key,
        addresses=addresses
    )

@buyer_address_app.route('/save_buyer_address', methods=['POST'])
def save_buyer_address():
    # Get buyer ID from session 
    buyer_id = session.get('BuyerID')
    if not buyer_id:
        flash("You must be logged in.")
        return redirect(url_for('buyer_address.buyer_address'))

    address_id = request.form.get('address_id')
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
    if address_id and address_id.strip() != "":
        update_query = """
            UPDATE buyer_addresses
            SET Full_Name=%s,
                Phone_Number=%s,
                Street=%s,
                Province=%s,
                Region=%s,
                Zip_Code=%s,
                Latitude=%s,
                Longitude=%s
            WHERE AddressID=%s AND BuyerID=%s
        """
        cursor.execute(update_query, (full_name, phone_number, street, province,
                                      region, zip_code, latitude, longitude,
                                      address_id, buyer_id))
        conn.commit()
        cursor.close()
        conn.close()

        flash("Address updated successfully!")
        return redirect(url_for('buyer_address.buyer_address'))


    cursor.execute("SELECT MAX(AddressID) FROM buyer_addresses")
    last_id = cursor.fetchone()[0]
    if last_id:
        new_id = f"BA{int(last_id[2:]) + 1:04d}"
    else:
        new_id = "BA1000"

    # Insert into DB
    insert_query = """
        INSERT INTO buyer_addresses
        (AddressID, BuyerID, Full_Name, Phone_Number, Street, Province, Region, Zip_Code, Latitude, Longitude)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(insert_query, (new_id, buyer_id, full_name, phone_number, street,
                                  province, region, zip_code, latitude, longitude))
    conn.commit()
    cursor.close()
    conn.close()

    flash("Address saved successfully!")
    return redirect(url_for('buyer_address.buyer_address'))

@buyer_address_app.route('/delete_buyer_address/<address_id>')
def delete_buyer_address(address_id):
    buyer_id = session.get('BuyerID')
    if not buyer_id:
        flash("You must be logged in.")
        return redirect(url_for('buyer_address.buyer_address'))

    conn = get_db_connection()
    cursor = conn.cursor()

    query = "DELETE FROM buyer_addresses WHERE AddressID = %s AND BuyerID = %s"
    cursor.execute(query, (address_id, buyer_id))
    conn.commit()

    cursor.close()
    conn.close()

    flash("Address deleted successfully!")
    return redirect(url_for('buyer_address.buyer_address'))