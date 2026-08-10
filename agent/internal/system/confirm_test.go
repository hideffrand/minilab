package system

import (
	"testing"
	"time"
)

func TestConfirmStoreSingleUse(t *testing.T) {
	s := newConfirmStore()

	if s.consume("anything") {
		t.Fatal("consume succeeded with no token issued")
	}

	tok, err := s.issue()
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if tok == "" {
		t.Fatal("issue returned an empty token")
	}

	if s.consume("not-the-token") {
		t.Fatal("consume accepted a wrong token")
	}

	if !s.consume(tok) {
		t.Fatal("consume rejected the correct token")
	}
	if s.consume(tok) {
		t.Fatal("consume accepted a reused token")
	}
}

func TestConfirmStoreExpiry(t *testing.T) {
	s := newConfirmStore()
	tok, err := s.issue()
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	s.exp = time.Now().Add(-time.Second)
	if s.consume(tok) {
		t.Fatal("consume accepted an expired token")
	}
}
