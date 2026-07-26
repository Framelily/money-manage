package main

import (
	"fmt"
	"log"
	"math"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

// RunMySQLMigration copies every row from the legacy MySQL database into the
// Postgres database this binary is configured for, then prints a per-table
// comparison so the copy can be checked before the cutover.
//
// Routing the data through the same Go structs on both sides is what makes this
// safe: tinyint/boolean, NULL handling, timezone interpretation, and Thai text
// encoding are all the drivers' problem, not ours.
func RunMySQLMigration() {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		log.Fatal("MYSQL_DSN is required — see .env.example")
	}

	src, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatal("Failed to open the MySQL source: ", err)
	}

	// Refuse to run twice: a second pass would fail on duplicate primary keys
	// partway through and leave the destination half-written.
	var existing int64
	DB.Table("users").Count(&existing)
	if existing > 0 {
		log.Fatalf("destination already holds %d users — clear it before re-running", existing)
	}

	fmt.Println("== copying ==")
	copyTable[User](src, "users")
	copyTable[InstallmentPlan](src, "installment_plans")
	copyTable[Installment](src, "installments")
	copyTable[BudgetItem](src, "budget_items")
	copyTable[BudgetMonthlyValue](src, "budget_monthly_values")
	copyTable[PersonDebt](src, "person_debts")
	copyTable[DebtPayment](src, "debt_payments")

	fmt.Println()
	fmt.Println("== verification: rows src/dst, sums src/dst ==")
	ok := true
	ok = compare(src, "users") && ok
	ok = compare(src, "installment_plans", "total_amount") && ok
	ok = compare(src, "installments", "amount") && ok
	ok = compare(src, "budget_items") && ok
	ok = compare(src, "budget_monthly_values", "value") && ok
	ok = compare(src, "person_debts", "total_amount", "paid_amount") && ok
	ok = compare(src, "debt_payments", "amount") && ok

	fmt.Println()
	var months []string
	DB.Table("budget_monthly_values").Distinct().Pluck("month", &months)
	fmt.Println("Thai month values in Postgres:", months)

	fmt.Println()
	if !ok {
		log.Fatal("MISMATCH found — do not cut over")
	}
	fmt.Println("All tables match.")
}

// copyTable reads a whole table from src and inserts it into DB.
func copyTable[T any](src *gorm.DB, label string) {
	var rows []T
	// Unscoped so soft-deleted users are carried across too. It is a no-op for
	// the six models with no DeletedAt field.
	if err := src.Unscoped().Find(&rows).Error; err != nil {
		log.Fatalf("read %s: %v", label, err)
	}
	if len(rows) == 0 {
		fmt.Printf("  %-24s 0 rows, skipped\n", label)
		return
	}
	// Omit associations: the slices were never preloaded, and letting GORM walk
	// them would insert children twice. SkipHooks keeps callbacks out of it.
	err := DB.Session(&gorm.Session{SkipHooks: true}).
		Omit(clause.Associations).
		CreateInBatches(rows, 200).Error
	if err != nil {
		log.Fatalf("write %s: %v", label, err)
	}
	fmt.Printf("  %-24s %d rows\n", label, len(rows))
}

// compare reports row counts and column sums on both sides. Returns false on
// any difference.
func compare(src *gorm.DB, table string, sumCols ...string) bool {
	var srcCount, dstCount int64
	src.Table(table).Count(&srcCount)
	DB.Table(table).Count(&dstCount)

	match := srcCount == dstCount
	fmt.Printf("  %-24s rows %6d / %-6d", table, srcCount, dstCount)

	for _, col := range sumCols {
		var srcSum, dstSum float64
		expr := "COALESCE(SUM(" + col + "), 0)"
		src.Table(table).Select(expr).Scan(&srcSum)
		DB.Table(table).Select(expr).Scan(&dstSum)
		// Tolerance rather than equality: these are float64 sums.
		if math.Abs(srcSum-dstSum) > 0.005 {
			match = false
		}
		fmt.Printf("  %s %.2f / %.2f", col, srcSum, dstSum)
	}

	if match {
		fmt.Println("  OK")
	} else {
		fmt.Println("  MISMATCH")
	}
	return match
}
