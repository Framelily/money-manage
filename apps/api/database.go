package main

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Bangkok",
		AppConfig.DBHost,
		AppConfig.DBUser,
		AppConfig.DBPass,
		AppConfig.DBName,
		AppConfig.DBPort,
		AppConfig.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Supabase caps connections per project and Supavisor drops idle ones.
	// GORM leaves MaxOpenConns unbounded, which would exhaust the quota.
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to access the underlying sql.DB:", err)
	}
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(2)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	err = db.AutoMigrate(
		&User{},
		&InstallmentPlan{},
		&Installment{},
		&BudgetItem{},
		&BudgetMonthlyValue{},
		&PersonDebt{},
		&DebtPayment{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	DB = db
	log.Println("Database connected and migrated successfully")
}
