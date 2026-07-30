CREATE TABLE `sale_price_corrections` (
	`correction_id` integer PRIMARY KEY AUTOINCREMENT,
	`sale_id` integer NOT NULL,
	`old_selling_price` integer NOT NULL,
	`new_selling_price` integer NOT NULL,
	`corrected_at` text NOT NULL,
	`reason` text,
	CONSTRAINT `fk_sale_price_corrections_sale_id_sales_sale_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE RESTRICT
);
--> statement-breakpoint
ALTER TABLE `loss_entries` ADD `replacement_bundle_id` integer REFERENCES bundles(bundle_id);--> statement-breakpoint
ALTER TABLE `sales` ADD `original_listed_price` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `sales` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `returned_date` text;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales` (
	`sale_id` integer PRIMARY KEY AUTOINCREMENT,
	`item_id` integer NOT NULL UNIQUE,
	`sale_date` text NOT NULL,
	`selling_price` integer NOT NULL,
	`profit` integer,
	`original_listed_price` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`returned_date` text,
	CONSTRAINT `fk_sales_item_id_inventory_items_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`item_id`) ON DELETE RESTRICT
);
--> statement-breakpoint
INSERT INTO `__new_sales`(`sale_id`, `item_id`, `sale_date`, `selling_price`, `profit`, `original_listed_price`, `status`, `returned_date`) SELECT `sale_id`, `item_id`, `sale_date`, `selling_price`, `profit`, `original_listed_price`, `status`, `returned_date` FROM `sales`;--> statement-breakpoint
DROP TABLE `sales`;--> statement-breakpoint
ALTER TABLE `__new_sales` RENAME TO `sales`;--> statement-breakpoint
PRAGMA foreign_keys=ON;