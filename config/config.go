package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	AppPort                string
	DatabaseURL            string
	DatabaseHost           string
	DatabasePort           int
	DatabaseUser           string
	DatabasePassword       string
	DatabaseName           string
	DatabaseSSLMode        string
	StorageProvider        string
	SupabaseURL            string
	SupabaseAnonKey        string
	SupabaseServiceRoleKey string
	SupabaseBucket         string
	MinIOEndpoint          string
	MinIOAccessKey         string
	MinIOSecretKey         string
	MinIOUseSSL            bool
}

func LoadConfig() (Config, error) {
	// ✅ 1. สั่งให้ Viper ลองหาไฟล์ .env และอ่านค่ามา (ถ้ามี)
	viper.SetConfigFile(".env")
	_ = viper.ReadInConfig() // ใช้ _ รับ Error ไว้ เพราะถ้ารันใน Docker อาจจะไม่มีไฟล์นี้ ก็ปล่อยผ่านได้

	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	getString := func(keys ...string) string {
		for _, key := range keys {
			if value := strings.TrimSpace(viper.GetString(key)); value != "" {
				return value
			}
		}
		return ""
	}

	getInt := func(keys ...string) int {
		for _, key := range keys {
			if value := viper.GetInt(key); value != 0 {
				return value
			}
		}
		return 0
	}

	getEnv := func(key string) string {
		return strings.TrimSpace(os.Getenv(key))
	}

	getBool := func(keys ...string) bool {
		for _, key := range keys {
			if value := viper.GetString(key); strings.EqualFold(value, "true") {
				return true
			}
			if value := viper.GetString(key); strings.EqualFold(value, "false") {
				return false
			}
		}
		return false
	}

	// ✅ 2. เพิ่ม Default ให้ App Port ป้องกันเซิร์ฟเวอร์บึ้ม
	appPort := getString("APP.PORT", "APP_PORT", "PORT")
	if appPort == "" {
		appPort = "8080"
	}

	databaseURL := getString("DATABASE.URL", "DATABASE_URL")
	if databaseURL == "" {
		databaseURL = getEnv("DATABASE_URL")
	}

	databaseHost := getString("POSTGRES.HOST", "POSTGRES_HOST", "DB_HOST")
	if databaseHost == "" {
		databaseHost = getEnv("PGHOST")
	}
	databasePort := getInt("POSTGRES.PORT", "POSTGRES_PORT")
	if databasePort == 0 {
		if value := getEnv("PGPORT"); value != "" {
			if parsed, err := strconv.Atoi(value); err == nil {
				databasePort = parsed
			}
		}
	}
	if databasePort == 0 {
		databasePort = 5432
	}
	databaseUser := getString("POSTGRES.USER", "POSTGRES_USER")
	if databaseUser == "" {
		databaseUser = getEnv("PGUSER")
	}
	databasePassword := getString("POSTGRES.PASSWORD", "POSTGRES_PASSWORD")
	if databasePassword == "" {
		databasePassword = getEnv("PGPASSWORD")
	}
	databaseName := getString("POSTGRES.DBNAME", "POSTGRES_DBNAME")
	if databaseName == "" {
		databaseName = getEnv("PGDATABASE")
	}
	databaseSSLMode := getString("POSTGRES.SSLMODE", "POSTGRES_SSLMODE")
	if databaseSSLMode == "" {
		databaseSSLMode = "require"
	}

	storageProvider := strings.ToLower(getString("STORAGE.PROVIDER", "STORAGE_PROVIDER"))
	if storageProvider == "" {
		storageProvider = "minio"
	}
	supabaseURL := strings.TrimRight(getString("SUPABASE.URL", "SUPABASE_URL"), "/")
	supabaseAnonKey := getString("SUPABASE.ANON_KEY", "SUPABASE_ANON_KEY")
	supabaseServiceRoleKey := getString("SUPABASE.SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY")
	supabaseBucket := getString("SUPABASE.BUCKET", "SUPABASE_BUCKET")
	if supabaseBucket == "" {
		supabaseBucket = "image"
	}

	// MinIO defaults
	minioEndpoint := getString("MINIO.ENDPOINT", "MINIO_ENDPOINT")
	if minioEndpoint == "" {
		minioEndpoint = "minio:9000"
	}
	minioAccessKey := getString("MINIO.ACCESS_KEY", "MINIO_ACCESS_KEY")
	if minioAccessKey == "" {
		minioAccessKey = "minioadmin"
	}
	minioSecretKey := getString("MINIO.SECRET_KEY", "MINIO_SECRET_KEY")
	if minioSecretKey == "" {
		minioSecretKey = "minioadmin"
	}
	minioUseSSL := getBool("MINIO.USE_SSL", "MINIO_USE_SSL")

	// Debug: show whether DATABASE_URL is visible at runtime (no secrets printed)
	if getEnv("DATABASE_URL") != "" || getString("DATABASE.URL", "DATABASE_URL") != "" {
		fmt.Println("DEBUG: DATABASE_URL detected in environment/viper")
	} else {
		fmt.Println("DEBUG: DATABASE_URL NOT detected in environment/viper")
	}

	// Set config values
	config := Config{
		AppPort:                appPort,
		DatabaseURL:            databaseURL,
		DatabaseHost:           databaseHost,
		DatabasePort:           databasePort,
		DatabaseUser:           databaseUser,
		DatabasePassword:       databasePassword,
		DatabaseName:           databaseName,
		DatabaseSSLMode:        databaseSSLMode,
		StorageProvider:        storageProvider,
		SupabaseURL:            supabaseURL,
		SupabaseAnonKey:        supabaseAnonKey,
		SupabaseServiceRoleKey: supabaseServiceRoleKey,
		SupabaseBucket:         supabaseBucket,
		MinIOEndpoint:          minioEndpoint,
		MinIOAccessKey:         minioAccessKey,
		MinIOSecretKey:         minioSecretKey,
		MinIOUseSSL:            minioUseSSL,
	}

	return config, nil
}

func (c *Config) GetConnectionString() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}

	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.DatabaseHost,
		c.DatabasePort,
		c.DatabaseUser,
		c.DatabasePassword,
		c.DatabaseName,
		c.DatabaseSSLMode)
}
