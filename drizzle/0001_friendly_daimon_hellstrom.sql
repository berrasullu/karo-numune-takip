CREATE TABLE `movements` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`sampleId` varchar(64) NOT NULL,
	`sampleName` varchar(255) NOT NULL,
	`type` enum('in','out','count','gönderim') NOT NULL,
	`quantityDelta` int NOT NULL,
	`resultingQuantity` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sampleCodeMetadata` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(255) NOT NULL,
	`species` enum('TOPAZ','PLACCO') NOT NULL,
	`color` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sampleCodeMetadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `samples` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`species` enum('TOPAZ','PLACCO') NOT NULL,
	`category` varchar(255) NOT NULL,
	`size` varchar(255) NOT NULL,
	`finish` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`minimumQuantity` int NOT NULL DEFAULT 5,
	`notes` text,
	`photoUri` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `samples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`sampleIds` text NOT NULL,
	`employeeName` varchar(255) NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) NOT NULL DEFAULT 'email';--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isEmailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);