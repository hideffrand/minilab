# Mooni Backend — Architecture Notes

Study notes from a session on `agent/`'s structure, Go interfaces, and how it
compares to a repository/service-style codebase.

---

## Q1. How is the backend structured, why is it considered good, and where did the pattern come from?

### Structure

```
main.go                    composition root — everything wired here
internal/
  config/    env → Config struct (validate dirs, resolve symlinks)
  auth/      RequireAPIKey — middleware, constant-time compare
  cache/     Cache interface + Redis impl (no-op when unconfigured)
  files/     Handler + Service  — /api/files/*
  media/     Handler + Service  — /api/media/* (optional)
  system/    Handler + logic   — /api/system/*
  fsutil/    shared path-sandbox (Resolve)
  pairing/   QR/pairing-code encoding
```

Key structural moves:

1. **Handler/Service split per feature.** Handler = thin HTTP layer (parse request, call service, map errors→status). Service = business logic (list, rename, copy, invalidation). Handler never touches the filesystem; Service never touches `http.ResponseWriter`. `agent/internal/files/handler.go:17` vs `service.go:27`.

2. **Package-per-feature, not per-layer.** All of a feature's files live together. Contrast with `controllers/` + `services/` folders — Go idiom is feature slices.

3. **Infrastructure behind an interface.** `cache.Cache` (`internal/cache/cache.go:15`) — services depend on the small interface, not on Redis. Testable against a fake, Redis becomes a drop-in.

4. **Cross-cutting concerns as middleware.** Auth wraps muxes in `main.go:56`, not inside each handler. Nested muxes = protected vs public (health) split.

5. **Everything imported from `internal/`** — Go enforces that no outside code can import these.

### Theory behind it

- **Separation of Concerns / Single Responsibility** — each struct does one thing.
- **Layered architecture** — handler (transport) → service (domain) → infra (fs/redis). Direction of dependency points inward.
- **Dependency Inversion** (the `Cache` interface) — "depend on abstractions, not concretions"; this is the core of **Hexagonal/Ports-and-Adapters** (Alistair Cockburn, 2005): the service is the domain core, Redis and HTTP are interchangeable *adapters* plugged into *ports*.
- **Composition Root** — wiring happens in exactly one place (`main.go`), never scattered. From Mark Seemann's *Dependency Injection in .NET*.
- **Middlewares** — `func(http.Handler) http.Handler` chain = the "decorator" pattern applied to HTTP.
- The mux layering (public health, authed file/system) is defense-in-depth: security enforced at the boundary, not per-route.

### Who did it first (the lineage everyone copies)

The **Controller → Service → Repository** layering is not originally Go — it's from enterprise Java/.NET:

- **Rails (2004)** — MVC with "skinny controllers, fat models", which later pushed business logic into **service objects**.
- **Spring (2002)** — formalized the layered Controller/Service/Repository split used by basically every enterprise web app.
- **Martin Fowler, *Patterns of Enterprise Application Architecture* (2002)** — named the **Service Layer** and **Transaction Script** patterns; the theoretical basis of the Handler/Service split.
- **Eric Evans, *DDD* (2003)** — bounded contexts → the "package per feature" idea.

For Go specifically, the pattern is the ecosystem's consensus standard layout, largely from **golang-standards/project-layout** (2018, one of the most-forked Go repos) plus Google's Go style guides — the `internal/` convention, thin handlers, `Handler` structs holding a `Service`, middleware wrapping muxes. Google's own services (and then Kubernetes, Docker, etc.) popularized exactly this shape, so most Go HTTP backends you see today look structurally like this one.

The net effect: this codebase is "boring textbook Go" — clean layering, testable seams at the cache boundary, security at the edges. Nothing clever, which is the point.

---

## Q2. How do we use interfaces for the packages? Isn't it supposed to "replace" OOP?

### The one interface in the codebase

There's exactly one: `cache.Cache` (`agent/internal/cache/cache.go:15`):

```go
type Cache interface {
	Get(ctx context.Context, key string) ([]byte, bool)
	GetInt64(ctx context.Context, key string) int64
	Set(ctx context.Context, key string, value []byte, ttl time.Duration)
	Incr(ctx context.Context, key string) int64
}
```

It's held as a field by the three consumers:

- `files.Service` → `cache cache.Cache` (service.go:29)
- `media.Service` → same
- `system.Handler` → `cache cache.Cache` (handler.go:19)

Two concrete types satisfy it **without declaring anything**:

- `*cache` — the real Redis-backed one (cache.go:25)
- `fakeCache` — a plain struct in tests (`internal/files/cache_test.go:16`, `media/media_test.go:16`)

### How this "replaces" OOP

In Java/C# you'd write:

```java
abstract class Cache { abstract byte[] get(...); }
class RedisCache extends Cache { ... }
class FakeCache extends Cache { ... }
```

Polymorphism comes from **inheritance**: subtype → parent, virtual dispatch at runtime, `FakeCache extends Cache` to override behavior.

Go has no classes, no `extends`, no virtual dispatch. An interface is just a **set of method signatures**, and a type satisfies it by *having* those methods — structural typing / duck typing. `fakeCache` doesn't know `Cache` exists. `*cache` doesn't either. They both just happen to implement the 4 methods, so both are assignable to `Cache`.

So the interface's job is the same as an abstract base class's — a **polymorphism seam** — but:

- No inheritance hierarchy to freeze (fragile-base-class problem gone).
- The seam is minimal: only the 4 methods the consumers actually use, not a whole base class.
- A consumer (e.g. `files.Service`) can't call any Redis-only methods even if it wanted to — it only sees the contract.

### The practical payoff here

**Testability without mocks.** `TestListServedFromCacheUntilMutation` (files/cache_test.go:53) builds a `fakeCache` (two maps, ~30 lines) and hands it to the real `Service`. In OOP you'd subclass or pull in a mocking framework. Here a throwaway struct with the right method names works, because `Service` only asked for `Cache`, not for Redis.

**Dependency inversion.** The service depends on the abstraction (`Cache`), and the concrete Redis type is injected once at the composition root (`main.go:40`). That's the "D" of SOLID.

### Two nuances

1. **The no-op trick needs no interface at all.** `cache.New("", "")` returns a `*cache` with `rdb == nil`, and every method is a silent no-op/fail-open. So "uncached mode" isn't a second implementation — it's the same type with different config. The interface exists for tests, not for that.

2. **Interface placed next to implementation, not consumer.** Go idiom says interfaces *generally belong to the package that uses them* — i.e. `files` would declare `type Cache interface { Get(...); ... }` and `cache` would just happen to satisfy it. Here it's defined in `cache` and imported by consumers. Works fine at this size; it's the less idiomatic placement. Moving it to a `files.go`/`media.go`-local interface would decouple consumers from the `cache` package entirely — worth doing only if you want zero coupling between features.

---

## Q3. Why not use a `services` package with exported interfaces (the hris style)? What differs from the pasted code?

The pasted code was the **"repository + service-interface" style** (common in bigger enterprise Go projects). Mooni uses the **"concrete service + small consumer-side interface"** style. The differences are concrete and deliberate:

### 1. Constructor returns the interface (pasted) vs concrete struct (mooni)

`NewInboxService(...) InboxService` returns the interface. This is the pattern Go's own docs explicitly push *against*:

- Go proverb (Rob Pike): **"The bigger the interface, the weaker the abstraction."** A 6-method `InboxService` interface with exactly one implementation is a promise nobody needs.
- Go wiki / CodeReviewComments: **"accept interfaces, return structs"** — an interface that exists only because the constructor returned it is an anti-pattern. Every new method forces you to edit the interface, the impl, and every stub.
- Mooni's `files.NewService` returns `*Service` (concrete). Nothing needs to mock it, so it has no interface. `cache.New` returns `*cache` (concrete) too.

### 2. Interface ownership: provider-defined vs consumer-defined

- Pasted: the interface lives *next to* its impl, in the `services` package. All consumers import it and program against it.
- Mooni: the only interface is `cache.Cache`, defined at the infrastructure boundary and consumed by services. The service layer itself has no interface because **no consumer needs to fake it** — handlers aren't unit-tested, services are.

Rule of thumb: interfaces exist to serve the *consumer*. The pasted code invents a consumer-side need (mocking services in handler tests) that Mooni simply doesn't have.

### 3. The repo layer is the real structural difference

The pasted code has four layers: handler → service → repo → DB. `repo.InboxRepository` abstracts SQL, `TransactionManager` wraps transactions.

Moni has two: handler → service, and the service calls `os.ReadDir`, `os.Rename`, `fsutil.Resolve` directly (`files/service.go:90-120`). **The filesystem stdlib *is* the repository.** Wrapping `os` behind a `FileStore` interface would be pure ceremony — `os` is already the abstraction, already testable, already understood. A repo interface pays off only when the backend is swappable (SQL→Postgres, file→S3) or when SQL must be isolated from logic. Here the data store is fixed.

`db.TransactionManager` → mooni has no transactions. Nothing to abstract.

### 4. models/ + dto/ packages vs one type

Pasted: `models.Inbox`, `dto.SendInbox` — persistence model and wire DTO split. Mooni: `Entry` (files/service.go:18) is both the domain object and the JSON payload (it has json tags). Correct for a file listing; the split only pays when the DB model and API shape actually diverge.

### 5. The one interface mooni *does* keep — and why

`cache.Cache` (4 methods) exists for one reason: **tests.** `files/cache_test.go:16` injects `fakeCache`; real Redis would make the tests non-hermetic. That's a genuine consumer-side need, so the interface survives. It's also small — the "consumer defines only what it uses" rule, applied.

### Summary table

| | pasted (hris) | mooni |
|---|---|---|
| service abstraction | interface per feature | concrete struct |
| interface owner | provider | consumer (cache only) |
| data access | repo layer over sqlx | stdlib `os` directly |
| models/DTO | split packages | one struct, json tags |
| interface purpose | mocking + swappable DB | test seam for infra |

The hris style isn't wrong — it's the standard shape for DB-backed apps with real handler-test suites. Mooni dropped it because it's a two-layer filesystem server: there's no DB to abstract, no service to mock, and adding the interface/impl churn would serve no consumer. If Mooni later needs S3 backends or handler unit tests, *then* a consumer-defined `FileStore`/service interface appears — in the package that needs it.

---

## Key takeaways

1. **Layer**: handler (transport) → service (logic) → infra, dependencies pointing inward.
2. **Interfaces are consumer-side contracts, not class hierarchies.** Small, few-method, defined where the need is.
3. **"Accept interfaces, return structs."** Constructor-returned interfaces are an anti-pattern.
4. **Abstractions cost churn.** Add one only when a real consumer needs it (mock, second backend) — YAGNI applies to interfaces too.
5. **stdlib as the abstraction.** `os`, `net/http`, `context` already give you the seams; don't re-wrap them for ceremony.
