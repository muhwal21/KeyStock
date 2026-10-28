-- KeyStock — Mechanical Keyboard Inventory
-- Dump struktur + data demo (MySQL 8 / MariaDB 10.6+).
--
-- Import:
--   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS keystock_inventory CHARACTER SET utf8mb4"
--   mysql -u root -p keystock_inventory < database/keystock-demo.sql
--
-- Akun uji (login pakai username atau email):
--   dosen / dosen@keystock.local / 12345678  -> admin
--   staff / staff@keystock.local / 12345678  -> staff
--
-- Stok, harga beli/jual, lokasi rak, dan riwayat pergerakan adalah data simulasi.
-- Tanggal riwayat mengikuti waktu dump dibuat; `npm run db:fresh` membuat ulang data
-- demo dengan tanggal hari ini.
--
-- Host: localhost    Database: keystock_inventory
-- ------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(80) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES
(1,'keyboard','Keyboard'),
(2,'switch','Switches'),
(3,'aksesoris','Accessories'),
(4,'keycaps','Keycaps'),
(5,'deskmat','Deskmats');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `url` varchar(1000) DEFAULT NULL,
  `data` longblob DEFAULT NULL,
  `mime_type` varchar(40) DEFAULT NULL,
  `byte_size` int(10) unsigned DEFAULT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `product_images_product_id_sort_order` (`product_id`,`sort_order`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES
(1,1,'/images/noir-spade65-qmk.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(2,2,'/images/noir-spade65-custom-build.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(3,3,'/images/noir-spade65.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(4,4,'/images/noir-timeless65.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(5,5,'/images/noir-timeless82-v2.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(6,6,'/images/noir-timeless82v2-classic.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(7,7,'/images/noir-timeless82v2-special-edition.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(8,8,'/images/noir-timeless82v2-dandadan.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(9,9,'/images/noir-timeless82v2-ntl.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(10,10,'/images/noir-timeless-1800.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(11,11,'/images/noir-n1x.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(12,12,'/images/noir-timeless-he.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(13,13,'/images/wl-framer-f1.webp',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(14,14,'/images/noir-citron-linear-switch.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(15,15,'/images/noir-zest-tactile-switch.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(16,16,'/images/noir-spade65-fr4-extra-plate.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(17,17,'/images/noir-type-c-straight-cable-yc8-aviator.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(18,18,'/images/noir-type-c-coiled-cable-yc8-aviator.jpg',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(19,19,'/images/noir-zen-garden-white-light-deskmat.png',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(20,20,'/images/noir-zen-garden-black-dark-deskmat.png',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(21,21,'/images/noir-solace-deskmat.png',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(22,22,'/images/noir-aztec-deskmat-copy.png',NULL,NULL,NULL,0,'2026-10-28 14:08:39'),
(23,23,'/images/wl-knob-sans.png',NULL,NULL,NULL,0,'2026-10-28 14:08:39');
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int(10) unsigned NOT NULL,
  `sku` varchar(100) NOT NULL,
  `name` varchar(190) NOT NULL,
  `brand` varchar(120) NOT NULL,
  `description` text DEFAULT NULL,
  `price_min` decimal(14,2) DEFAULT NULL,
  `price_max` decimal(14,2) DEFAULT NULL,
  `purchase_price` decimal(14,2) DEFAULT NULL,
  `selling_price` decimal(14,2) DEFAULT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'IDR',
  `listing_status` varchar(120) NOT NULL DEFAULT 'Ready',
  `warehouse_stock` int(10) unsigned NOT NULL DEFAULT 0,
  `reorder_point` int(10) unsigned NOT NULL DEFAULT 5,
  `storage_location` varchar(80) DEFAULT NULL,
  `supplier_id` int(10) unsigned DEFAULT NULL,
  `source_url` varchar(500) DEFAULT NULL,
  `image_url` varchar(1000) DEFAULT NULL,
  `specifications` json NOT NULL,
  `variants` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `supplier_id` (`supplier_id`),
  KEY `products_category_id` (`category_id`),
  KEY `products_name` (`name`),
  KEY `products_warehouse_stock` (`warehouse_stock`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES
(1,1,'noir-spade65-qmk','Noir Spade65 QMK/VIA','Noir Gear','Keyboard 65% aluminium bertema art deco, QMK/VIA, tri-mode, termasuk carrying case.',1299000.00,1899000.00,974000.00,1299000.00,'IDR','Ready',14,6,'A-1-01',1,'https://www.noirgear.com/products/noir-spade65-qmk','/images/noir-spade65-qmk.jpg','{\"Form factor\":\"65%, 66 key\",\"Material\":\"Aluminium 6063\",\"Koneksi\":\"Wired Type-C, 2.4GHz, Bluetooth 5.0 (3 device)\",\"Mount\":\"Gasket (silicone)\",\"Plate\":\"PC (FR4 opsional)\",\"Fitur\":\"QMK/VIA, multi layout ANSI/ISO + split spacebar, knob multimedia, hot-swap 3&5 pin, keycap PBT dye-sub\"}','[\"Warna: Obsidian Black / Pale Golden / Titanium Grey\",\"Tipe: Fully Assembled / Barebone\",\"Switch: Linear (KTT KU Orange) / Tactile (KTT KU Brown) / No Switch\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(2,1,'noir-spade65-custom-build','Noir Spade65 Custom Build (QMK/VIA)','Noir Gear','Spade65 QMK/VIA yang bisa dipilih keycap & switch eksklusif Noir.',1699000.00,1899000.00,1274000.00,1699000.00,'IDR','Ready',3,6,'A-1-02',1,'https://www.noirgear.com/products/noir-spade65-custom-build','/images/noir-spade65-custom-build.jpg','{\"Basis\":\"Spade65 QMK/VIA (aluminium 6063, 65%, tri-mode, gasket)\"}','[\"Warna: Obsidian Black / Pale Golden / Titanium Grey\",\"Keycaps: Alpine Bloom / Decocaps / Mayan / Zen Garden / Dream Circuit\",\"Switch: Noir Citron (linear) / Noir Zest (tactile) / KTT Silent\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(3,1,'noir-spade65','Noir Spade65 (Non QMK/VIA)','Noir Gear','Spade65 versi non-QMK, aluminium 6063, tri-mode.',1099000.00,1899000.00,824000.00,1099000.00,'IDR','Sold out (saat dicek)',22,6,'A-1-03',1,'https://www.noirgear.com/products/noir-spade65','/images/noir-spade65.jpg','{\"Form factor\":\"65%, 66 key\",\"Berat\":\"1355 ±10 g\",\"Material\":\"Aluminium 6063\",\"Koneksi\":\"Wired, 2.4GHz, Bluetooth 5.0\",\"Kabel\":\"Coiled + straight\"}','[\"Warna: Obsidian Black / Pale Golden\",\"Tipe: Fully Assembled / Barebone\",\"Switch: KTT KU Orange / KTT KU Brown / No Switch\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(4,1,'noir-timeless65','Noir Timeless65','Noir Gear','Keyboard 65% wireless dengan layar TFT & knob, ringkas untuk desk bersih.',999000.00,999000.00,749000.00,999000.00,'IDR','Ready',9,6,'A-1-04',1,'https://www.noirgear.com/products/noir-timeless65','/images/noir-timeless65.jpg','{\"Form factor\":\"65%\",\"Koneksi\":\"Type-C, 2.4GHz dongle, Bluetooth (3 device)\",\"Fitur\":\"Multi layout PCB (ANSI/ISO, 7u), gasket mount, flex-cut PCB & PC plate, 3 layer foam, VIA, layar TFT LCD, knob programmable, stabilizer pre-lubed, south-facing, hot-swap 3&5 pin\",\"Keycap\":\"PBT doubleshot\"}','[\"Warna: Black / Beige\",\"Switch: Linear (Huano Grape Orange) / Tactile (Outemu GTMX Purple) / Silent (KTT Silent)\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(5,1,'noir-timeless82-v2','Noir Timeless82 V2','Noir Gear','Keyboard 75% exploded (81 key) wireless, baterai 6000mAh, layar TFT, knob.',1199000.00,1199000.00,899000.00,1199000.00,'IDR','Ready',18,6,'A-1-05',1,'https://www.noirgear.com/products/noir-timeless82-v2','/images/noir-timeless82-v2.jpg','{\"Form factor\":\"75% exploded, 81 key\",\"Koneksi\":\"Type-C, 2.4GHz, Bluetooth (3 device)\",\"Baterai\":\"6000mAh\",\"Mount\":\"Gasket (silicone)\",\"Foam\":\"IXPE, Poron, silicone case foam\",\"Fitur\":\"Multi layout PCB, TFT LCD, knob, hot-swap 3&5 pin\"}','[\"Warna: Beige / Black\",\"Switch: Tactile (Outemu GTMX Purple) / Linear (Huano Grape Orange) / Silent (KTT Silent)\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(6,1,'noir-timeless82v2-classic','Noir Timeless82 v2 Classic Edition','Noir Gear','Versi entry-level Timeless82 v2 (wired) dengan fitur lengkap.',999000.00,999000.00,749000.00,999000.00,'IDR','Ready',0,6,'A-1-06',1,'https://www.noirgear.com/products/noir-timeless82v2-classic','/images/noir-timeless82v2-classic.jpg','{\"Form factor\":\"75%\",\"Koneksi\":\"Wired\",\"Fitur\":\"Multi layout PCB (ANSI/ISO, 7u), gasket mount, flex-cut PCB & PC plate, 3 layer foam, VIA, layar TFT LCD, knob programmable, stabilizer pre-lubed, south-facing, hot-swap 3&5 pin\",\"Keycap\":\"PBT doubleshot + accent keycaps\"}','[\"Warna: Black / Beige\",\"Switch: Huano Grape Orange / Outemu GTMX Purple / KTT Silent\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(7,1,'noir-timeless82v2-special-edition','Noir Timeless82 v2 Special Edition','Noir Gear','Edisi tema mitologi Nordik, QMK/VIA, plate PC + FR4.',1199000.00,1199000.00,899000.00,1199000.00,'IDR','Ready',27,6,'A-1-07',1,'https://www.noirgear.com/products/noir-timeless82v2-special-edition','/images/noir-timeless82v2-special-edition.jpg','{\"Form factor\":\"75%, 81 key\",\"Material\":\"ABS\",\"Koneksi\":\"Wired, 2.4GHz, Bluetooth\",\"Plate\":\"PC & FR4\",\"Fitur\":\"QMK/VIA, TFT LCD, knob, hot-swap, tempest mod\"}','[\"Warna: Genesis / Ragnarok\",\"Switch: KTT KU Orange / KTT KU Brown / KTT Silent\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(8,1,'noir-timeless82v2-dandadan','Noir Timeless82 v2 Dan Da Dan Edition','Noir Gear','Edisi kolaborasi Dan Da Dan dengan novelty keycaps resmi.',1199000.00,1199000.00,899000.00,1199000.00,'IDR','Sold out (saat dicek)',11,6,'A-2-01',1,'https://www.noirgear.com/products/noir-timeless82v2-dandadan','/images/noir-timeless82v2-dandadan.jpg','{\"Form factor\":\"75%\",\"Koneksi\":\"Type-C, 2.4GHz, Bluetooth (3 device)\",\"Fitur\":\"Gasket Poron, TFT LCD, knob, hot-swap, keycap PBT dye-sub\"}','[\"Warna: Alien / Spirit\",\"Switch: Huano Grape Orange / Outemu GTMX Purple\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(9,1,'noir-timeless82v2-ntl','Noir Timeless82 v2 x Nevertoolavish \"Type Out Loud\"','Noir Gear','Edisi kolaborasi Nevertoolavish.',1499000.00,1499000.00,1124000.00,1499000.00,'IDR','Sold out (saat dicek)',16,6,'A-2-02',1,'https://www.noirgear.com/products/noir-timeless82v2-ntl','/images/noir-timeless82v2-ntl.jpg','{\"Form factor\":\"75%\",\"Material\":\"ABS\",\"Koneksi\":\"Type-C, 2.4GHz, Bluetooth (3 device)\",\"Fitur\":\"Gasket Poron, TFT LCD, knob, hot-swap\"}','[\"NTL Edition\",\"Switch: Huano Grape Orange / Outemu GTMX Purple\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(10,1,'noir-timeless-1800','Noir Timeless1800','Noir Gear','Keyboard 96% (98 key) wireless dengan numpad, layar TFT & knob.',1199000.00,1199000.00,899000.00,1199000.00,'IDR','Sold out (saat dicek)',24,6,'A-2-03',1,'https://www.noirgear.com/products/noir-timeless-1800','/images/noir-timeless-1800.jpg','{\"Form factor\":\"96%, 98 key\",\"Koneksi\":\"Wired, 2.4GHz, Bluetooth\",\"Fitur\":\"Multi layout PCB (ANSI/ISO, 7u), gasket mount, flex-cut PCB & PC plate, 3 layer foam, VIA, layar TFT LCD, knob programmable, stabilizer pre-lubed, south-facing, hot-swap 3&5 pin\"}','[\"Warna: Black / Beige\",\"Switch: KTT KU Orange / KTT KU Brown / KTT Silent\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(11,1,'noir-n1x','Noir N1/X','Noir Gear','Keyboard 65% wireless bertema Neo-Urban, VIA/QMK, side glow RGB.',999000.00,999000.00,749000.00,999000.00,'IDR','Ready',5,6,'A-2-04',1,'https://www.noirgear.com/products/noir-n1x','/images/noir-n1x.jpg','{\"Form factor\":\"65%, 66 key\",\"Berat\":\"700 g\",\"Koneksi\":\"Type-C, 2.4GHz, Bluetooth (3 device)\",\"Plate\":\"POM\",\"Baterai\":\"3000mAh\",\"Fitur\":\"VIA/QMK, gasket, side glow RGB, knob, screw-in stabilizer, hot-swap, keycap PBT dye-sub\"}','[\"Warna: Zest / Citron\",\"Switch: KTT KU Orange / KTT KU Brown\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(12,1,'noir-timeless-he','Noir Timeless HE (Hall Effect)','Noir Gear','Keyboard 75% magnetic/Hall Effect: rapid trigger, actuation adjustable, polling 8K.',699000.00,699000.00,524000.00,699000.00,'IDR','Ready',13,6,'A-2-05',1,'https://www.noirgear.com/products/noir-timeless-he','/images/noir-timeless-he.jpg','{\"Form factor\":\"75%, 82 key\",\"Switch\":\"Outemu Pink Magnetic\",\"Koneksi\":\"Wired Type-C\",\"Plate\":\"Steel\",\"Dimensi\":\"330 x 145 x 28 mm\",\"Berat\":\"1000 g\",\"Fitur\":\"Rapid trigger, adjustable actuation, DKS, mod-tap, 8K polling, knob\"}','[\"Warna: Black Wheeler / White Trooper / Blue Plasma\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(13,1,'wl-framer-f1','Framer F1','Work Louder','Keyboard mekanikal low-profile 75% kolaborasi Framer x Work Louder. Body CNC aluminium anodized, 2 rotary encoder, LCD full-color 100×310 px, icon keycaps & shortcut Framer, bisa tampilkan statistik situs Framer. Plug-and-play USB-C / Bluetooth, tanpa driver.',439.00,439.00,329.25,439.00,'USD','Ready (ships 1-3 hari kerja)',19,6,'A-2-06',2,'https://worklouder.cc/framer-f1','/images/wl-framer-f1.webp','{\"Switch\":\"Linear 55g, two-stage spring\",\"Layout\":\"75% / 84 key\",\"Enclosure\":\"CNC aluminium, anodized black\",\"Tilt riser\":\"Magnetik, silicone\",\"Keycap\":\"Dye-sub PBT\",\"Knob\":\"2x CNC aluminium anodized black\",\"Layar\":\"LCD full-color 100×310 px, kaca CNC\",\"Koneksi\":\"USB-C / Bluetooth\",\"Dimensi\":\"1.935 x 12.435 x 31.485 cm\",\"Garansi\":\"2 tahun, worldwide shipping, retur 14 hari\"}','[]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(14,2,'noir-citron-linear-switch','Noir Citron Linear Switch','Noir Gear','Switch linear 5-pin factory lubed, long pole.',39000.00,189000.00,25000.00,39000.00,'IDR','Ready',8,6,'B-1-01',1,'https://www.noirgear.com/products/noir-citron-linear-switch','/images/noir-citron-linear-switch.jpg','{\"Tipe\":\"Linear\",\"Actuation\":\"50g (bottom out 58g)\",\"Travel\":\"1.9mm / total 3.5mm\",\"Housing\":\"Top POM, bottom Nylon, stem POM\",\"Pin\":\"5 pin\"}','[\"10 pcs – Rp39.000\",\"50 pcs – Rp189.000\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(15,2,'noir-zest-tactile-switch','Noir Zest Tactile Switch','Noir Gear','Switch tactile 5-pin factory lubed, long pole.',39000.00,189000.00,25000.00,39000.00,'IDR','Sold out (saat dicek)',21,6,'B-1-02',1,'https://www.noirgear.com/products/noir-zest-tactile-switch','/images/noir-zest-tactile-switch.jpg','{\"Tipe\":\"Tactile\",\"Actuation\":\"40g (bottom out 60g)\",\"Travel\":\"2.0mm / total 3.5mm\",\"Housing\":\"Top POM, bottom Nylon, stem POM\",\"Pin\":\"5 pin\"}','[\"10 pcs – Rp39.000\",\"50 pcs – Rp189.000\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(16,3,'noir-spade65-fr4-extra-plate','Noir Spade65 FR4 Extra Plate','Noir Gear','Plate FR4 tambahan untuk Spade65.',9000.00,9000.00,5000.00,9000.00,'IDR','Sold out (saat dicek)',8,6,'C-1-01',1,'https://www.noirgear.com/products/noir-spade65-fr4-extra-plate','/images/noir-spade65-fr4-extra-plate.jpg','{\"Kompatibel\":\"Noir Spade65\"}','[\"Split spacebar + ANSI\",\"Split spacebar + ISO\",\"Regular spacebar + ANSI\",\"Regular spacebar + ISO\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(17,3,'noir-type-c-straight-cable-yc8-aviator','Noir Type-C Straight Cable YC8 Aviator','Noir Gear','Kabel braided double-sleeved dengan konektor aviator YC8.',119000.00,119000.00,71000.00,119000.00,'IDR','Sold out (saat dicek)',12,6,'C-1-02',1,'https://www.noirgear.com/products/noir-type-c-straight-cable-yc8-aviator','/images/noir-type-c-straight-cable-yc8-aviator.jpg','{\"Panjang\":\"165 cm (15 cm C–YC8 + 150 cm A–YC8)\",\"Konektor\":\"YC8 4-pin aviator, USB-C & USB-A gold plated\",\"Kompatibel\":\"Semua keyboard Noir\"}','[\"Midnight Black\",\"Ultimate Grey\",\"Olive Green\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(18,3,'noir-type-c-coiled-cable-yc8-aviator','Noir Type-C Coiled Cable YC8 Aviator','Noir Gear','Kabel coiled braided dengan konektor aviator YC8.',129000.00,129000.00,77000.00,129000.00,'IDR','Sold out (saat dicek)',15,6,'C-1-03',1,'https://www.noirgear.com/products/noir-type-c-coiled-cable-yc8-aviator','/images/noir-type-c-coiled-cable-yc8-aviator.jpg','{\"Panjang\":\"175 cm (coil 15 cm, Ø20 mm)\",\"Konektor\":\"YC8 4-pin aviator, USB-C & USB-A gold plated\",\"Kompatibel\":\"Semua keyboard Noir\"}','[\"Ultimate Grey\",\"Olive Green\",\"Midnight Black\"]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(19,5,'noir-zen-garden-white-light-deskmat','Noir Zen Garden White/Light Deskmat','Noir Gear','Deskmat full-size untuk keyboard + mouse.',229000.00,229000.00,142000.00,229000.00,'IDR','Ready',10,6,'C-1-04',1,'https://www.noirgear.com/products/noir-zen-garden-white-light-deskmat','/images/noir-zen-garden-white-light-deskmat.png','{\"Ukuran\":\"900 x 400 x 4 mm\",\"Bahan atas\":\"Microfiber halus, tahan air\",\"Bahan bawah\":\"Karet anti slip\"}','[]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(20,5,'noir-zen-garden-black-dark-deskmat','Noir Zen Garden Black/Dark Deskmat','Noir Gear','Deskmat full-size untuk keyboard + mouse.',229000.00,229000.00,142000.00,229000.00,'IDR','Ready',26,6,'C-2-01',1,'https://www.noirgear.com/products/noir-zen-garden-black-dark-deskmat','/images/noir-zen-garden-black-dark-deskmat.png','{\"Ukuran\":\"900 x 400 x 4 mm\",\"Bahan atas\":\"Microfiber halus, tahan air\",\"Bahan bawah\":\"Karet anti slip\"}','[]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(21,5,'noir-solace-deskmat','Noir Solace Deskmat','Noir Gear','Deskmat full-size untuk keyboard + mouse.',229000.00,229000.00,142000.00,229000.00,'IDR','Ready',4,6,'C-2-02',1,'https://www.noirgear.com/products/noir-solace-deskmat','/images/noir-solace-deskmat.png','{\"Ukuran\":\"900 x 400 x 4 mm\",\"Bahan atas\":\"Microfiber halus, tahan air\",\"Bahan bawah\":\"Karet anti slip\"}','[]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(22,5,'noir-aztec-deskmat-copy','Noir Nordic Bloom Deskmat','Noir Gear','Deskmat full-size untuk keyboard + mouse.',229000.00,229000.00,142000.00,229000.00,'IDR','Ready',17,6,'C-2-03',1,'https://www.noirgear.com/products/noir-aztec-deskmat-copy','/images/noir-aztec-deskmat-copy.png','{\"Ukuran\":\"900 x 400 x 4 mm\",\"Bahan atas\":\"Microfiber halus, tahan air\",\"Bahan bawah\":\"Karet anti slip\"}','[]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(23,4,'wl-knob-sans','k•no•b Sans Keyset','Work Louder','Keyset low-profile untuk switch MX, spray coating dengan legend laser-etched.',74.98,74.98,52.49,74.98,'USD','Ready (ships 1-3 hari kerja)',20,6,'B-1-03',2,'https://worklouder.cc/knob-sans','/images/wl-knob-sans.png','{\"Material\":\"ABS+PC\",\"Profil\":\"Low profile (stem MX)\",\"Spacing\":\"MX 19.05 x 19.05 mm\",\"Jumlah\":\"114 keycap\",\"Kompatibel\":\"Nomad [E] (ANSI & ISO), Knob1 (ANSI & ISO), Nuphy Air 75/96 (ANSI), mayoritas keyboard MX low-profile ANSI dengan stabilizer MX inline\"}','[]',1,'2026-10-28 14:08:39','2026-10-28 14:08:39');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `movement_type` enum('IN','OUT','ADJUSTMENT') NOT NULL,
  `quantity` int(10) unsigned NOT NULL,
  `stock_before` int(10) unsigned NOT NULL,
  `stock_after` int(10) unsigned NOT NULL,
  `reason` enum('PURCHASE','RETURN_IN','SALE','DAMAGED','LOST','RETURN_OUT','STOCK_COUNT') NOT NULL DEFAULT 'STOCK_COUNT',
  `unit_cost` decimal(14,2) DEFAULT NULL,
  `unit_price` decimal(14,2) DEFAULT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'IDR',
  `note` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_movements_product_id_created_at` (`product_id`,`created_at`),
  KEY `stock_movements_user_id_created_at` (`user_id`,`created_at`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES
(1,1,1,'ADJUSTMENT',10,0,10,'STOCK_COUNT',974000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(2,1,2,'OUT',1,10,9,'DAMAGED',974000.00,NULL,'IDR','Unit rusak saat pengiriman','2026-10-25 07:51:00'),
(3,1,1,'IN',5,9,14,'PURCHASE',974000.00,NULL,'IDR','Restock dari supplier','2026-10-28 02:00:00'),
(4,2,1,'ADJUSTMENT',5,0,5,'STOCK_COUNT',1274000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(5,2,2,'OUT',2,5,3,'SALE',1274000.00,1699000.00,'IDR','Penjualan ke pelanggan tetap','2026-10-26 05:34:00'),
(6,3,1,'ADJUSTMENT',22,0,22,'STOCK_COUNT',824000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(7,3,2,'OUT',4,22,18,'SALE',824000.00,1099000.00,'IDR','Penjualan ke pelanggan tetap','2026-10-23 07:25:00'),
(8,3,1,'IN',4,18,22,'PURCHASE',824000.00,NULL,'IDR','Restock dari supplier','2026-10-28 01:00:00'),
(9,4,1,'ADJUSTMENT',1,0,1,'STOCK_COUNT',749000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(10,4,2,'IN',8,1,9,'PURCHASE',749000.00,NULL,'IDR','Restock dari supplier','2026-10-25 02:51:00'),
(11,5,1,'ADJUSTMENT',21,0,21,'STOCK_COUNT',899000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(12,5,2,'OUT',3,21,18,'SALE',899000.00,1199000.00,'IDR','Pesanan marketplace dikirim','2026-10-28 07:00:00'),
(13,6,1,'ADJUSTMENT',0,0,0,'STOCK_COUNT',749000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(14,7,1,'ADJUSTMENT',19,0,19,'STOCK_COUNT',899000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(15,7,2,'IN',7,19,26,'PURCHASE',899000.00,NULL,'IDR','Restock dari supplier','2026-10-22 02:42:00'),
(16,7,1,'IN',4,26,30,'PURCHASE',899000.00,NULL,'IDR','Barang datang dari distributor','2026-10-24 01:08:00'),
(17,7,2,'OUT',2,30,28,'SALE',899000.00,1199000.00,'IDR','Penjualan toko offline','2026-10-26 07:34:00'),
(18,7,1,'OUT',1,28,27,'SALE',899000.00,1199000.00,'IDR','Pesanan marketplace dikirim','2026-10-28 05:00:00'),
(19,8,1,'ADJUSTMENT',11,0,11,'STOCK_COUNT',899000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(20,9,1,'ADJUSTMENT',20,0,20,'STOCK_COUNT',1124000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(21,9,2,'OUT',4,20,16,'SALE',1124000.00,1499000.00,'IDR','Penjualan ke pelanggan tetap','2026-10-24 07:08:00'),
(22,10,1,'ADJUSTMENT',18,0,18,'STOCK_COUNT',899000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(23,10,2,'IN',6,18,24,'PURCHASE',899000.00,NULL,'IDR','Restock dari supplier','2026-10-26 02:34:00'),
(24,11,1,'ADJUSTMENT',4,0,4,'STOCK_COUNT',749000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(25,11,2,'OUT',3,4,1,'SALE',749000.00,999000.00,'IDR','Pesanan marketplace dikirim','2026-10-22 07:42:00'),
(26,11,1,'IN',4,1,5,'PURCHASE',749000.00,NULL,'IDR','Pembelian ulang batch baru','2026-10-27 01:17:00'),
(27,12,1,'ADJUSTMENT',15,0,15,'STOCK_COUNT',524000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(28,12,2,'OUT',2,15,13,'SALE',524000.00,699000.00,'IDR','Penjualan toko offline','2026-10-23 05:25:00'),
(29,13,1,'ADJUSTMENT',16,0,16,'STOCK_COUNT',329.25,NULL,'USD','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(30,13,2,'IN',5,16,21,'PURCHASE',329.25,NULL,'USD','Restock dari supplier','2026-10-23 02:25:00'),
(31,13,1,'OUT',2,21,19,'SALE',329.25,439.00,'USD','Penjualan toko offline','2026-10-27 07:17:00'),
(32,14,1,'ADJUSTMENT',8,0,8,'STOCK_COUNT',25000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(33,15,1,'ADJUSTMENT',18,0,18,'STOCK_COUNT',25000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(34,15,2,'IN',4,18,22,'PURCHASE',25000.00,NULL,'IDR','Restock dari supplier','2026-10-23 01:25:00'),
(35,15,1,'OUT',1,22,21,'DAMAGED',25000.00,NULL,'IDR','Unit rusak saat pengiriman','2026-10-25 07:51:00'),
(36,16,1,'ADJUSTMENT',0,0,0,'STOCK_COUNT',5000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(37,16,2,'IN',8,0,8,'PURCHASE',5000.00,NULL,'IDR','Restock dari supplier','2026-10-27 02:17:00'),
(38,17,1,'ADJUSTMENT',16,0,16,'STOCK_COUNT',71000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(39,17,2,'OUT',3,16,13,'SALE',71000.00,119000.00,'IDR','Pesanan marketplace dikirim','2026-10-23 07:25:00'),
(40,17,1,'OUT',1,13,12,'SALE',71000.00,119000.00,'IDR','Penjualan ke pelanggan tetap','2026-10-25 05:51:00'),
(41,18,1,'ADJUSTMENT',15,0,15,'STOCK_COUNT',77000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(42,19,1,'ADJUSTMENT',1,0,1,'STOCK_COUNT',142000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(43,19,2,'IN',7,1,8,'PURCHASE',142000.00,NULL,'IDR','Restock dari supplier','2026-10-24 02:08:00'),
(44,19,1,'IN',4,8,12,'PURCHASE',142000.00,NULL,'IDR','Barang datang dari distributor','2026-10-26 01:34:00'),
(45,19,2,'OUT',2,12,10,'SALE',142000.00,229000.00,'IDR','Penjualan toko offline','2026-10-28 07:00:00'),
(46,20,1,'ADJUSTMENT',26,0,26,'STOCK_COUNT',142000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(47,21,1,'ADJUSTMENT',8,0,8,'STOCK_COUNT',142000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(48,21,2,'OUT',4,8,4,'SALE',142000.00,229000.00,'IDR','Penjualan ke pelanggan tetap','2026-10-26 07:34:00'),
(49,22,1,'ADJUSTMENT',13,0,13,'STOCK_COUNT',142000.00,NULL,'IDR','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(50,22,2,'OUT',2,13,11,'SALE',142000.00,229000.00,'IDR','Pesanan marketplace dikirim','2026-10-27 05:17:00'),
(51,22,1,'IN',6,11,17,'PURCHASE',142000.00,NULL,'IDR','Restock dari supplier','2026-10-28 02:00:00'),
(52,23,1,'ADJUSTMENT',19,0,19,'STOCK_COUNT',52.49,NULL,'USD','Stok awal simulasi untuk demo UAS.','2026-10-20 00:16:00'),
(53,23,2,'IN',4,19,23,'PURCHASE',52.49,NULL,'USD','Pembelian ulang batch baru','2026-10-22 01:42:00'),
(54,23,1,'OUT',3,23,20,'SALE',52.49,74.98,'USD','Pesanan marketplace dikirim','2026-10-24 07:08:00');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `contact_person` varchar(120) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `suppliers_name` (`name`),
  KEY `suppliers_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES
(1,'Noir Gear Official Store',NULL,NULL,NULL,NULL,'https://www.noirgear.com','Referensi dari sumber produk; kontak supplier belum diverifikasi.',1,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(2,'Work Louder Official Store',NULL,NULL,NULL,NULL,'https://worklouder.cc','Referensi dari sumber produk; kontak supplier belum diverifikasi.',1,'2026-10-28 14:08:39','2026-10-28 14:08:39');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `username` varchar(40) DEFAULT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','staff','lecturer') NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `approval_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  `token_version` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- Password reset secrets are stored as SHA-256 hashes and expire after 30 minutes.
DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE `password_resets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_resets_token_hash_unique` (`token_hash`),
  KEY `password_resets_user_id` (`user_id`),
  KEY `password_resets_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'Dosen Penguji','dosen','dosen@keystock.local','$2b$12$DHlFxMpkaIkEvAorm.NiEOmLs08XHHYUkhaL2m2o0wB0Jg/fflWae','lecturer',1,'approved',0,'2026-10-28 14:08:39','2026-10-28 14:08:39'),
(2,'Staff Gudang','staff','staff@keystock.local','$2b$12$/lKP.0VM7fzj6AB3KK.LhOvv9a9yXujn/8HdmZ5Hk1x.89Xm0qrmi','staff',1,'approved',0,'2026-10-28 14:08:39','2026-10-28 14:08:39');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
