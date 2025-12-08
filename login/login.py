from flask import Blueprint, render_template, request, redirect, flash, session
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import bcrypt
from dotenv import load_dotenv
import os

load_dotenv()

login_app = Blueprint('login', __name__)

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

def validate_credentials(username, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    sql_query= "SELECT BuyerID, Password FROM buyer WHERE Username = %s"
    cursor.execute(sql_query, (username,))
    user_data=cursor.fetchone()

    if user_data:
        user_id, hashed_password = user_data
        if check_password_hash(hashed_password, password):
            return user_id, 'buyer'
       
    sql_query = "SELECT SellerID, Password FROM seller WHERE Username = %s"
    cursor.execute(sql_query, (username,))
    user_data = cursor.fetchone()

    cursor.close()
    conn.close()

    if user_data:
        user_id, hashed_password = user_data
        if check_password_hash(hashed_password, password):
            return user_id, 'seller'

    return None

@login_app.route('/login', methods=['GET', 'POST'])
def login():
    error_message = ""
    if request.method=='POST':
        username = request.form['Username']
        password = request.form['Password']

        user_data = validate_credentials(username, password)
   
        if user_data:
            user_id, user_type = user_data
            session['user_id'] = user_id
            session['user_type']= user_type
            session['username']= username

            if user_type == 'buyer':
                session['BuyerID'] = user_id
                return redirect('/homepage_buyer')
            elif user_type == 'seller':
                session['SellerID'] = user_id
                return redirect('/homepage_seller')
            else:
                error_message = "Invalid user type"

        error_message = "Invalid username or password. Please try again or sign up first."

    return render_template('login.html', error_message=error_message)

@login_app.route('/', methods=['POST'])
def index():
    return render_template('index.html')