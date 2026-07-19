package service

import "testing"

func TestIsAllowedImageTypeAcceptsKnownMimeTypeWithoutExtension(t *testing.T) {
	cases := []struct {
		name        string
		ext        string
		contentType string
		want       bool
	}{
		{name: "jpeg ext", ext: ".jpeg", contentType: "image/jpeg", want: true},
		{name: "blob fallback", ext: ".blob", contentType: "image/jpeg", want: true},
		{name: "empty ext", ext: "", contentType: "image/png", want: true},
		{name: "unsupported mime", ext: "", contentType: "application/pdf", want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isAllowedImageType(tc.ext, tc.contentType); got != tc.want {
				t.Fatalf("isAllowedImageType(%q, %q) = %v, want %v", tc.ext, tc.contentType, got, tc.want)
			}
		})
	}
}
