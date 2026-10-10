const express=require("express");
const cors=require("cors");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const Database=require("better-sqlite3");
const path=require("path");

const app=express(), db=new Database("dahashop.db");
const PORT=process.env.PORT||3000, JWT_SECRET=process.env.JWT_SECRET||"CHANGE_THIS_SECRET_IN_PRODUCTION";
app.use(cors()); app.use(express.json()); app.use(express.static(path.join(__dirname,"public")));

db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
 password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shops(
 id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL, name TEXT NOT NULL,
 FOREIGN KEY(owner_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY AUTOINCREMENT, shop_id INTEGER NOT NULL, name TEXT NOT NULL,
 price INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 0, description TEXT DEFAULT '',
 FOREIGN KEY(shop_id) REFERENCES shops(id)
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, total INTEGER NOT NULL,
 payment_method TEXT NOT NULL, status TEXT DEFAULT 'Pending', address TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS order_items(
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
 quantity INTEGER NOT NULL, price INTEGER NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id)
);`);

function token(u){return jwt.sign({id:u.id,role:u.role},JWT_SECRET,{expiresIn:"7d"})}
function auth(req,res,next){try{const h=req.headers.authorization||"";req.user=jwt.verify(h.replace("Bearer ",""),JWT_SECRET);next()}catch(e){res.status(401).json({error:"Unauthorized"})}}
function role(r){return (req,res,next)=>req.user.role===r?next():res.status(403).json({error:"Forbidden"})}

app.post("/api/register",(req,res)=>{
 const {name,email,password,role="customer"}=req.body;
 if(!name||!email||!password)return res.status(400).json({error:"Name, email and password are required"});
 if(!["customer","seller"].includes(role))return res.status(400).json({error:"Invalid role"});
 try{
  const hash=bcrypt.hashSync(password,12);
  const info=db.prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)").run(name,email.toLowerCase(),hash,role);
  if(role==="seller")db.prepare("INSERT INTO shops(owner_id,name) VALUES(?,?)").run(info.lastInsertRowid,name+"'s Shop");
  const u=db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(info.lastInsertRowid);
  res.json({user:u,token:token(u)});
 }catch(e){res.status(409).json({error:"Email already registered"})}
});

app.post("/api/login",(req,res)=>{
 const {email,password}=req.body, u=db.prepare("SELECT * FROM users WHERE email=?").get((email||"").toLowerCase());
 if(!u||!bcrypt.compareSync(password||"",u.password))return res.status(401).json({error:"Invalid email or password"});
 const safe={id:u.id,name:u.name,email:u.email,role:u.role};res.json({user:safe,token:token(safe)});
});

app.get("/api/me",auth,(req,res)=>res.json(db.prepare("SELECT id,name,email,role,created_at FROM users WHERE id=?").get(req.user.id)));

app.get("/api/products",(req,res)=>res.json(db.prepare(`
SELECT p.id,p.name,p.price,p.stock,p.description,s.name shop
FROM products p JOIN shops s ON p.shop_id=s.id ORDER BY p.id DESC`).all()));

app.post("/api/products",auth,role("seller"),(req,res)=>{
 const shop=db.prepare("SELECT * FROM shops WHERE owner_id=?").get(req.user.id);
 if(!shop)return res.status(400).json({error:"Seller shop not found"});
 const {name,price,stock=0,description=""}=req.body;
 if(!name||!price)return res.status(400).json({error:"Name and price required"});
 const x=db.prepare("INSERT INTO products(shop_id,name,price,stock,description) VALUES(?,?,?,?,?)").run(shop.id,name,price,stock,description);
 res.json(db.prepare("SELECT * FROM products WHERE id=?").get(x.lastInsertRowid));
});

app.post("/api/orders",auth,(req,res)=>{
 const {items,payment_method,address}=req.body;
 if(!Array.isArray(items)||!items.length||!payment_method||!address)return res.status(400).json({error:"Items, payment method and address are required"});
 const tx=db.transaction(()=>{
  let total=0, rows=[];
  for(const item of items){
   const p=db.prepare("SELECT * FROM products WHERE id=?").get(item.product_id);
   const q=Number(item.quantity);
   if(!p||q<1||p.stock<q)throw new Error("Product unavailable");
   total+=p.price*q; rows.push({p,q});
  }
  const o=db.prepare("INSERT INTO orders(user_id,total,payment_method,address) VALUES(?,?,?,?)").run(req.user.id,total,payment_method,address);
  for(const r of rows){db.prepare("INSERT INTO order_items(order_id,product_id,quantity,price) VALUES(?,?,?,?)").run(o.lastInsertRowid,r.p.id,r.q,r.p.price);db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(r.q,r.p.id)}
  return o.lastInsertRowid;
 });
 try{res.json({order_id:tx(),message:"Order created"})}catch(e){res.status(400).json({error:e.message})}
});

app.get("/api/my-orders",auth,(req,res)=>res.json(db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC").all(req.user.id)));

app.get("/api/seller/orders",auth,role("seller"),(req,res)=>res.json(db.prepare(`
SELECT o.*,u.name customer FROM orders o JOIN users u ON o.user_id=u.id
WHERE EXISTS(SELECT 1 FROM order_items oi JOIN products p ON oi.product_id=p.id JOIN shops s ON p.shop_id=s.id WHERE oi.order_id=o.id AND s.owner_id=?)
ORDER BY o.id DESC`).all(req.user.id)));

app.get("/api/admin/users",auth,role("admin"),(req,res)=>res.json(db.prepare("SELECT id,name,email,role,created_at FROM users ORDER BY id DESC").all()));

app.listen(PORT,()=>console.log(`DahaShop API running on http://localhost:${PORT}`));