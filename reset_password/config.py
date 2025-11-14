import os


class Config:
    # Secret key for sessions and CSRF protection
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_default_secret_key_here'
   
    # Database configurations

    DB_HOST = os.getenv("AIVEN_HOST")
    DB_PORT = os.getenv("AIVEN_PORT")
    DB_USER = os.getenv("AIVEN_USER")
    DB_PASSWORD = os.getenv("AIVEN_PASSWORD")
    DB_NAME = os.getenv("AIVEN_DATABASE")


    # Email configurations for password reset
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 465  # SSL
    MAIL_USE_SSL = True
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")



