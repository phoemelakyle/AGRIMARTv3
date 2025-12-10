<div style="text-align: center; margin-bottom: 20px; 
            border: 2px solid #ccc; 
            padding: 15px; 
            border-radius: 15px; 
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
  <img src="readme_assets/agrimart_top.png" alt="Agrimart" width="1800" style="border-radius: 10px;"/>
</div>

<div style="text-align: center;">
  <h1 style="margin: 0;">AngkatAni</h1>  
  <p style="margin: 0; font-style: italic;">Connecting You to Local Farmers.</p>
</div>

---
>### <h2> 📑 Table of Contents </h2>
1. [Introduction](#introduction)  
2. [System Preview](#app-preview)  
3. [Features](#features)  
   - [👥 User Role Selection & Registration](#user-role-selection--registration)  
   - [🏪 Seller Features](#seller-features)  
   - [🛒 Buyer Features](#buyer-features)  
   - [🛍️ Cart & Checkout System](#cart--checkout-system)  
   - [🎨 UI/UX & Visual Assets](#uiux--visual-assets)  
   - [🖼️ Image Management](#image-management)  
4. [Technologies Used](#technologies-used)  
5. [Setup & Installation](#setup--installation)  
6. [Database Schema](#database-schema)  
7. [Contributors](#contributors)  
8. [Acknowledgments](#acknowledgments)


>### <h2 id="introduction">🚀 Introduction</h2>

  <p style="text-align: justify; text-indent: 2em;">
  <strong>AngkatAni</strong> is a digital platform designed to connect farmers, agri-product sellers, and buyers in a streamlined online marketplace. It aims to enhance agricultural productivity and profitability by simplifying the supply chain and promoting direct trade. It offers a digital marketplace with dynamic homepages, product listings, shopping cart systems, and order tracking for efficient transactions. 


</p>

---

<div id="app-preview" align="center">
  <h2>📱 System Preview</h2>
  <p>Take a look at AngkatAni in action:</p>

  <!-- Landing Page -->
  <h4>🌾 AngkatAni Landing Page</h4>
  <img src="./readme_assets/landing_page.jpeg" alt="Landing Page" style="max-width:100%; margin:10px 0;">

  <!-- Role Selection -->
  <h4>👥 Select Role Page</h4>
  <img src="./readme_assets/select_role.jpeg" alt="Select Role" style="max-width:100%; margin:10px 0;">

  <!-- Login -->
  <h4>🔐 User Login Interface</h4>
  <img src="./readme_assets/login.jpeg" alt="Login Page" style="max-width:100%; margin:10px 0;">

  <!-- Buyer Homepage -->
  <h4>🛍️ Buyer Homepage Dashboard</h4>
  <img src="./readme_assets/homepage_buyer.jpeg" alt="Buyer Homepage" style="max-width:100%; margin:10px 0;">

  <!-- Cart -->
  <h4>🛒 Shopping Cart Overview</h4>
  <img src="./readme_assets/cart.jpeg" alt="Cart" style="max-width:100%; margin:10px 0;">

  <!-- Checkout -->
  <h4>✅ Checkout Summary Page</h4>
  <img src="./readme_assets/checkout.jpeg" alt="Checkout" style="max-width:100%; margin:10px 0;">

  <!-- Payment Option -->
  <h4>💳 Payment Options Selection</h4>
  <img src="./readme_assets/payment_option.jpeg" alt="Payment Options" style="max-width:100%; margin:10px 0;">

  <!-- Seller Homepage -->
  <h4>📈 Seller Homepage Dashboard</h4>
  <img src="./readme_assets/homepage_seller.jpeg" alt="Seller Homepage" style="max-width:100%; margin:10px 0;">

  <!-- Add Product -->
  <h4>➕ Add New Product Interface</h4>
  <img src="./readme_assets/add_product.jpeg" alt="Add Product" style="max-width:100%; margin:10px 0;">

  <!-- Buyer Orders: To Pay -->
  <h4>💸 Buyer Orders - To Pay</h4>
  <img src="./readme_assets/buyer_orders_to_pay.jpeg" alt="Buyer Orders To Pay" style="max-width:100%; margin:10px 0;">

  <!-- Buyer Orders: To Ship -->
  <h4>📦 Buyer Orders - To Ship</h4>
  <img src="./readme_assets/buyer_orders_to_ship.jpeg" alt="Buyer Orders To Ship" style="max-width:100%; margin:10px 0;">

  <!-- Buyer Orders: Delivered -->
  <h4>📬 Buyer Orders - Delivered</h4>
  <img src="./readme_assets/buyer_orders_delivered.jpeg" alt="Buyer Orders Delivered" style="max-width:100%; margin:10px 0;">

  <!-- Buyer Orders: Cancelled -->
  <h4>❌ Buyer Orders - Cancelled</h4>
  <img src="./readme_assets/buyer_orders_cancelled.jpeg" alt="Buyer Orders Cancelled" style="max-width:100%; margin:10px 0;">

  <!-- Seller Orders: Unpaid -->
  <h4>💼 Seller Orders - Unpaid</h4>
  <img src="./readme_assets/seller_orders_unpaid.jpeg" alt="Seller Orders Unpaid" style="max-width:100%; margin:10px 0;">

  <!-- Seller Orders: Shipping -->
  <h4>🚚 Seller Orders - Shipping</h4>
  <img src="./readme_assets/seller_orders_shipping.jpeg" alt="Seller Orders Shipping" style="max-width:100%; margin:10px 0;">

  <!-- Seller Orders: Completed -->
  <h4>✅ Seller Orders - Completed</h4>
  <img src="./readme_assets/seller_orders_completed.jpeg" alt="Seller Orders Completed" style="max-width:100%; margin:10px 0;">

  <!-- Seller Orders: Cancelled -->
  <h4>❌ Seller Orders - Cancelled</h4>
  <img src="./readme_assets/seller_orders_cancelled.jpeg" alt="Seller Orders Cancelled" style="max-width:100%; margin:10px 0;">
</div>

><h2 id="features">🛠️ Features</h2>


<h3 id="user-role-selection--registration">👥 User Role Selection & Registration</h3>
<ul>
  <li><strong>Role Choice:</strong> Select either  <code>Buyer</code> or <code>Seller</code> at signup.</li>
  <li><strong>Separate Flows:</strong> Distinct registration forms and dashboards for buyers and sellers.</li>
  <li><strong>Secure Login:</strong> Local authentication using email and hashed passwords (Flask with MySQL via XAMPP). User sessions are securely managed using Flask’s encrypted session cookies.</li>
</ul>

<h3 id="seller-features">🏪 Seller Features</h3>
<ul>
  <li><strong>Seller Dashboard:</strong> View and manage your product listings.</li>
  <li><strong>Add Products:</strong> Upload name, description, price, stock level, images, and its variations.</li>
  <li><strong>Edit/Delete Products:</strong> Modify details or remove items with one click.</li>
  <li><strong>Payment Preferences:</strong> Configure accepted methods (e.g., Cash on Delivery, GCash, PayMaya, etc.).</li>
</ul>

<h3 id="buyer-features">🛒 Buyer Features</h3>
<ul>
  <li><strong>Buyer Homepage:</strong> Browse all available products with thumbnails and prices.</li>
  <li><strong>Product Filtering:</strong> Narrow listings by different categories.</li>
  <li><strong>Product Detail View:</strong> Product name, image, stock, and variation.</li>
  <li><strong>Add to Cart:</strong> Select variants and quantities, then add to shopping cart.</li>
</ul>

<h3 id="cart--checkout-system">🛍️ Cart & Checkout System</h3>
<ul>
  <li><strong>Cart Management:</strong> Update quantities and remove items.</li>
  <li><strong>Checkout Flow:</strong> Confirm shipping address, select payment method, and place order.</li>
  <li><strong>Order Confirmation:</strong> Users can go to the Orders section where they can track the status of their order.</li>
</ul>

<h3 id="uiux--visual-assets">🎨 UI/UX & Visual Assets</h3>
<ul>
  <li><strong>Modular CSS:</strong> Page-specific styles for consistency and maintainability.</li>
  <li><strong>Interactive JS:</strong> `viewproduct.js` and others enhance UX with dynamic behaviors.</li>
  <li><strong>Branding Assets:</strong> Logos, icons, and illustrations kept in `static/images/`.</li>
</ul>

<h3 id="image-management">🖼️ Image Management</h3>
<ul>
  <li><strong>Product Images:</strong> Stored under `static/images/products/` directory, optimized for web delivery.</li>
  <li><strong>Shared Assets:</strong> Centralized `static/images/` for icons, banners, and logos.</li>
 


><h2 id="technologies-used">🖥️ Technologies Used</h2>

<h3 id="development-tools-and-frameworks">🛠️ Development Tools and Frameworks</h3>

<h4 id="google-chrome" style="margin-left: 20px;">1. Google Chrome</h4>
<ul style="margin-left: 40px;">
  <li>The primary web browser used to access and test the AngkatAni interface.</li>
</ul>

<h4 id="flask" style="margin-left: 20px;">2. Flask</h4>
<ul style="margin-left: 40px;">
  <li>Lightweight Python web framework powering the backend application and routing.</li>
</ul>

<h4 id="mysql-connector-python" style="margin-left: 20px;">3. mysql-connector-python</h4>
<ul style="margin-left: 40px;">
  <li>Python package used to connect and interact with the MySQL database.</li>
</ul>

<h3 id="backend-and-database">☁️ Backend and Database</h3>

<h4 id="mysql" style="margin-left: 20px;">4. MySQL</h4>
<ul style="margin-left: 40px;">
  <li>Relational database management system storing users, products, orders, and preferences.</li>
</ul>


<h3 id="programming-languages-and-frameworks">💻 Programming Languages & Frameworks</h3>

<h4 id="python" style="margin-left: 20px;">5. Python (Flask)</h4>
<ul style="margin-left: 40px;">
  <li>Handles server-side logic, API endpoints, and business rules.</li>
</ul>

<h4 id="html-css" style="margin-left: 20px;">6. HTML & CSS</h4>
<ul style="margin-left: 40px;">
  <li>Defines the structure and styling of the web pages for a responsive and consistent UI.</li>
</ul>

<h4 id="javascript" style="margin-left: 20px;">7. JavaScript</h4>
<ul style="margin-left: 40px;">
  <li>Implements dynamic behaviors and client-side interactivity (e.g., viewproduct.js).</li>
</ul>


<h3 id="hosting">☁️ Hosting & Runtime</h3>

<h4 id="local-flask-server" style="margin-left: 20px;">8. Local Flask Development Server</h4>
<ul style="margin-left: 40px;">
  <li>Runs the application locally via <code>app.py</code> for development and testing purposes.</li>
</ul>


>### <h2 id="setup--installation">🔧 Setup & Installation

After cloning or downloading the repository, move the `AGRIMART` folder to your Desktop.

1. Open your terminal: `Terminal > New Terminal`
2. You should see something like this: PS C:\Users\User\Desktop\AGRIMART>
3. Type these commands **one at a time**: 
```
python -m venv venv
.\venv\Scripts\activate
```
4. Set up your Python interpreter:
- Go to: `View > Command Palette > Python: Select Interpreter`
- Browse to your `AGRIMART/venv/Scripts` folder
- Select the `python` executable (black icon)

5. Then continue in terminal:

```
python -m pip install --upgrade pip
python -m pip install flask
pip install mysql-connector-python
pip install bcrypt
pip install Flask-Mail
```
6. To run the application:

```
python app.py
```

>### <h2 id="database-schema">🗃️ Database Schema

Below is the MySQL schema for setting up the `AGRIMART` database. You can execute these in MySQL Workbench or phpMyAdmin.

```sql
CREATE TABLE Seller(
  SellerID VARCHAR(6), 
  Name VARCHAR(255) NOT NULL, 
  Email VARCHAR(255) NOT NULL, 
  Address VARCHAR(255) NOT NULL,
  Phone_Number VARCHAR(255) NOT NULL, 
  Username VARCHAR(255) UNIQUE NOT NULL,
  Password VARCHAR(255) NOT NULL, 
  PRIMARY KEY(SellerID)
);

CREATE TABLE Buyer(
  BuyerID VARCHAR(6), 
  Name VARCHAR(255) NOT NULL, 
  Email VARCHAR(255) NOT NULL, 
  Address VARCHAR(255) NOT NULL,
  Phone_Number VARCHAR(255) NOT NULL, 
  Username VARCHAR(255) UNIQUE NOT NULL,
  Password VARCHAR(255) NOT NULL, 
  PRIMARY KEY(BuyerID)
);

CREATE TABLE Product_Category(
  CategoryID VARCHAR(6) NOT NULL,
  Category_Name VARCHAR(255) NOT NULL,
  PRIMARY KEY(CategoryID)
);

INSERT INTO product_category VALUES 
('CY1000', 'Fruits'), 
('CY1001','Vegetables'), 
('CY1002', 'Dairy'), 
('CY1003', 'Grains'), 
('CY1004', 'Spices'), 
('CY1005', 'Fertilizers'), 
('CY1006', 'Pesticides'), 
('CY1007', 'Seeds');

CREATE TABLE Product (
  ProductID VARCHAR(6) NOT NULL,
  SellerID VARCHAR(6) NOT NULL,
  Product_Name VARCHAR(255) NOT NULL,
  Weight DECIMAL(10,2) NOT NULL,
  Packaging_Length DECIMAL(10,2) NOT NULL,
  Packaging_Width DECIMAL(10,2) NOT NULL,
  Packaging_Height DECIMAL(10,2) NOT NULL,
  CategoryID VARCHAR(6) NOT NULL,
  ImageFilename VARCHAR(255) NOT NULL,
  PRIMARY KEY(ProductID),
  FOREIGN KEY(SellerID) REFERENCES Seller(SellerID),
  FOREIGN KEY(CategoryID) REFERENCES Product_Category(CategoryID)
);

ALTER TABLE Product ADD COLUMN Shipping_Fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

CREATE TABLE Product_Variation(
  VariationID VARCHAR(6) NOT NULL,
  ProductID VARCHAR(6) NOT NULL,
  Unit VARCHAR(255),
  Price DECIMAL(10,2) NOT NULL,
  Quantity INT(11) NOT NULL,
  PRIMARY KEY(VariationID),
  FOREIGN KEY(ProductID) REFERENCES Product(ProductID)
);

CREATE TABLE Methods_of_Payment(
  MethodID VARCHAR(6) NOT NULL,
  Payment_Method VARCHAR(255) NOT NULL,
  PRIMARY KEY(MethodID)
);

INSERT INTO Methods_of_Payment VALUES 
('MD1000', 'Cash on Delivery'), 
('MD1001', 'GCash'), 
('MD1002', 'Paymaya'), 
('MD1003', 'BDO'), 
('MD1004', 'BPI');

CREATE TABLE Payment_Options(
  Payment_OptionsID VARCHAR(6) NOT NULL,
  SellerID VARCHAR(6) NOT NULL,
  Payment_Method VARCHAR(255) NOT NULL,
  Account_Number VARCHAR(255) NOT NULL, 
  PRIMARY KEY(Payment_OptionsID),
  UNIQUE(SellerID, Payment_Method),
  FOREIGN KEY (SellerID) REFERENCES Seller(SellerID)
);

CREATE TABLE Cart (
  CartID VARCHAR(6), 
  BuyerID VARCHAR(6) NOT NULL, 
  ProductID VARCHAR(6) NOT NULL,
  VariationID VARCHAR(6) NOT NULL,
  Cart_Quantity INT(11) NOT NULL,
  PRIMARY KEY(CartID),
  FOREIGN KEY(BuyerID) REFERENCES Buyer(BuyerID),
  FOREIGN KEY(ProductID) REFERENCES Product(ProductID),
  FOREIGN KEY(VariationID) REFERENCES Product_Variation(VariationID)
);

CREATE TABLE Seller_Order(
  OrderID varchar(6) NOT NULL,
  SellerID varchar(6) NOT NULL, 
  ProductID varchar(6) NOT NULL,
  VariationID varchar(6) NOT NULL,
  Quantity int(11) NOT NULL,
  Total_Amount decimal(10,2) NOT NULL,
  Order_Date DATETIME DEFAULT CURRENT_TIMESTAMP,  
  Order_Status varchar(255) NOT NULL, 
  Payment_OptionsID varchar(6) NOT NULL, 
  Shipping_Address varchar(255) NOT NULL,
  Shipping_Date varchar(255) NOT NULL,
  PRIMARY KEY(OrderID), 
  FOREIGN KEY(SellerID) REFERENCES Seller(SellerID),
  FOREIGN KEY(ProductID) REFERENCES Product(ProductID), 
  FOREIGN KEY(VariationID) REFERENCES Product_Variation(VariationID),
  FOREIGN KEY(Payment_OptionsID) REFERENCES Payment_Options(Payment_OptionsID)
);

CREATE TABLE Buyer_Order(
  OrderID varchar(6) NOT NULL,
  BuyerID varchar(6) NOT NULL, 
  ProductID varchar(6) NOT NULL,
  VariationID varchar(6) NOT NULL,
  Quantity int(11) NOT NULL,
  Total_Amount decimal(10,2) NOT NULL,
  Order_Date DATETIME DEFAULT CURRENT_TIMESTAMP,  
  Order_Status varchar(255) NOT NULL, 
  Payment_OptionsID varchar(6) NOT NULL, 
  Shipping_Address varchar(255) NOT NULL,
  Shipping_Date varchar(255) NOT NULL,
  PRIMARY KEY(OrderID), 
  FOREIGN KEY(BuyerID) REFERENCES Buyer(BuyerID),
  FOREIGN KEY(ProductID) REFERENCES Product(ProductID), 
  FOREIGN KEY(VariationID) REFERENCES Product_Variation(VariationID),
  FOREIGN KEY(Payment_OptionsID) REFERENCES Payment_Options(Payment_OptionsID)
);

ALTER TABLE Seller ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE Buyer ADD COLUMN reset_token VARCHAR(255);

```

<h2 id = "contributors" style="background-color: rgba(0, 0, 0, 0.1); 
                           padding: 15px; 
                           border-radius: 10px; 
                           box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2); 
                           transition: transform 0.3s ease, box-shadow 0.3s ease; text-align: center;">
    🛡️AngkatAni Developers
</h2>


| **Photo**                                   | **Name**                          | **GitHub**                                          | **Facebook**                                   |
|---------------------------------------------|-----------------------------------|-----------------------------------------------------|------------------------------------------------|
| <img src="./readme_assets/Aeron_.png" alt="Aeron" width="100"/>   | **Aeron M. Evangelista**           | [AeronEvangelista](https://github.com/AeronEvangelista)  | [EvangelistAeron](https://www.facebook.com/EvangelistAeron) |
| <img src="./readme_assets/hillarie.webp" alt="Hillarie" width="100"/> | **Hillarie R. Godoy**              | [larielarie](https://github.com/larielarie)            | [hllrgdyy](https://www.facebook.com/hllrgdyy)  |
| <img src="./readme_assets/liza.webp" alt="Liza" width="100"/>      | **Liza Loraine M. Ignacio**        | [lizaloraine](https://github.com/lizaloraine)          | [liza.lorainee](https://www.facebook.com/liza.lorainee) |
| <img src="./readme_assets/phem.webp" alt="Phoemela" width="100"/> | **Phoemela Kyle M. Sebastian**     | [phoemelakyle](https://github.com/phoemelakyle)        | [phoemelakyle](https://www.facebook.com/phoemelakyle) |


  
<div style="border: 2px solid #ccc; padding: 15px; border-radius: 10px; margin-bottom: 20px; margin-top: 20px;">
<h2 id= "acknowledgments" style="text-align: center;margin-top: 0px;">🙏 Acknowledgments</h2>
  <p style="text-align: justify;">We would like to extend our gratitude to the following individuals for their invaluable support and guidance:</p>
  <ul style="text-align: justify;">
    <li><strong>Ms. Fatima Marie P. Agdon, MSCS</strong> – for her invaluable guidance, unwavering support, and constant encouragement throughout the course of this project. Her profound expertise, critical insights, and thoughtful direction have played a pivotal role in shaping the development of AngkatAni, ensuring its success and the effective execution of this project.
</li>
    <li><strong>Peers and Colleagues</strong> – The developers also wish to express their deep appreciation to their peers and colleagues for their helpful feedback, insightful discussions, and shared knowledge throughout this project. Their contributions have been essential in refining and improving the quality of this project.</li>
    <li><strong>Families and Friends</strong> – The developers are deeply grateful to their families and friends, whose unconditional support, understanding, and encouragement have been a source of strength throughout the research process. Their belief in the project’s potential and their constant emotional backing have been invaluable.</li>
    <li><strong>Research Contributors</strong> – The developers would like to acknowledge the contributions of various researchers, organizations, and data sources that provided essential information on digital marketplaces, agricultural commerce, and technology-driven solutions. These contributions have served as the foundation for this project, providing critical insights into the development of AngkatAni.
</li>
  </ul>
  <p style="text-align: justify;">With sincere gratitude, the developers acknowledge everyone who has supported and contributed to the success of this project.
</p>
</div>



