# NEAT Portal Documentation

- [Architecture](ARCHITECTURE.md): application boundaries and data flow.
- [Configuration](CONFIGURATION.md): runtime paths, secrets and integrations.
- [Deployment](DEPLOYMENT.md): installation, storage, backups and release checks.
- [Testing](TESTING.md): automated checks and isolated browser workflows.
- [Third-party notices](THIRD_PARTY_NOTICES.md): dependency attribution.
- [Architecture dashboard](architecture-dashboard/README.md): interactive
  source graph, API tracing and snapshot-based SQL diagrams.

The API and web application run independently of any other local source tree.
The architecture dashboard is optional development tooling; the portal does not
depend on it. Database snapshots in `evidence` contain structural information,
not the live database or application records.
