package repository

import "testing"

func TestBuildPublicURL(t *testing.T) {
	repo := &SupabaseMediaRepository{
		baseURL:    "https://abc.supabase.co",
		bucketName: "image",
	}

	got := repo.buildPublicURL("uploads/hello.jpg")
	want := "https://abc.supabase.co/storage/v1/object/public/image/uploads/hello.jpg"

	if got != want {
		t.Fatalf("expected %s, got %s", want, got)
	}
}
