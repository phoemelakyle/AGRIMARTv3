from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
import os

from reset_password.utils import send_reset_email

load_dotenv()

import mysql.connector

reset_app = Blueprint('reset', __name__)

# Route: Forgot Password
@reset_app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email']

        # Database connection
        db = get_db_connection()
        cursor = db.cursor()

        cursor.execute("SELECT * FROM buyer WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            cursor.execute("SELECT * FROM seller WHERE email = %s", (email,))
            user = cursor.fetchone()

        if user:
            # Generate token
            s = URLSafeTimedSerializer(current_app.secret_key)
            token = s.dumps(email, salt='password-reset')

            # Save token to DB
            if user[0].startswith('B'):
                cursor.execute("UPDATE buyer SET reset_token = %s WHERE email = %s", (token, email))
            else:
                cursor.execute("UPDATE seller SET reset_token = %s WHERE email = %s", (token, email))
            db.commit()

            reset_url = url_for('reset.reset_password', token=token, _external=True)

            html_body = f"""
            <html>
                <body>
                    <div style="text-align: center; font-family: Arial, sans-serif;">
                        <h1 style="color: green;">AngkatAni</h1>
                        <p><strong>Connecting you to Local Farmers</strong></p>
                        <p>Hey, {user[1]}</p>
                        <p>Your AngkatAni password can be reset by clicking the link below. If you did not request a new password, please ignore this email.</p>
                        <p><a href="{reset_url}" style="text-decoration: none; font-size: 16px; font-weight: bold; color: #007BFF;">Click this to reset your password</a></p>
                    </div>
                </body>
            </html>
            """

            msg = Message('Reset Your Password', recipients=[email])
            msg.html = html_body

            try:
                mail = current_app.extensions['mail']
                mail.send(msg)
                flash('A password reset link has been sent to your email.', 'success')
            else:
                flash('Unable to send reset email at this time. Please try again later.', 'danger')
                return redirect(url_for('login.login'))

            return redirect(url_for('login.login'))
        else:
            flash('No account found with that email.', 'danger')

    return render_template('login.html')

# Route: Reset Password via Token
@reset_app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        s = URLSafeTimedSerializer(current_app.secret_key)
        email = s.loads(token, salt='password-reset', max_age=3600)
    except SignatureExpired:
        flash('The reset link has expired.', 'danger')
        return redirect(url_for('login.login'))
    except Exception:
        flash('The reset link is invalid or has expired.', 'danger')
        return redirect(url_for('login.login'))

    if request.method == 'POST':
        new_password = request.form['new_password']
        hashed_password = generate_password_hash(new_password)

        db = get_db_connection()
        cursor = db.cursor()

        cursor.execute("SELECT * FROM buyer WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            cursor.execute("SELECT * FROM seller WHERE email = %s", (email,))
            user = cursor.fetchone()

        if user:
            if user[0].startswith('B'):
                cursor.execute("UPDATE buyer SET password = %s, reset_token = NULL WHERE email = %s", (hashed_password, email))
            else:
                cursor.execute("UPDATE seller SET password = %s, reset_token = NULL WHERE email = %s", (hashed_password, email))
            db.commit()

            flash('Your password has been reset successfully.', 'success')
            return redirect(url_for('login.login'))

    return render_template('reset_password.html', token=token)

# --- DB helper (should match the one from app.py) ---
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("AIVEN_HOST"),
        port=os.getenv("AIVEN_PORT"),
        user=os.getenv("AIVEN_USER"),
        password=os.getenv("AIVEN_PASSWORD"),
        database=os.getenv("AIVEN_DATABASE"),
        use_pure=True
    )