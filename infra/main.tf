terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region_primary
}

provider "google" {
  alias   = "europe"
  project = var.project_id
  region  = var.region_secondary
}

# Enable necessary services
resource "google_project_service" "services" {
  for_each = toset([
    "container.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "firestore.googleapis.com",
    "aiplatform.googleapis.com", # For Gemini
    "secretmanager.googleapis.com"
  ])
  service = each.key
  disable_on_destroy = false
}

# Artifact Registry (One central or per region? Let's do primary for now to save complexity, or per region for latency)
# Keeping it simple: One Repo in US for this stage, or multi-region. Multi-region 'us' is good.
resource "google_artifact_registry_repository" "talos_repo" {
  location      = "us"
  repository_id = "talosopolis-repo"
  description   = "Docker repository for Talosopolis microservices"
  format        = "DOCKER"

  depends_on = [google_project_service.services]
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "talos-vpc"
  auto_create_subnetworks = false
}

# Subnets
resource "google_compute_subnetwork" "subnet_us" {
  name          = "talos-subnet-us"
  region        = var.region_primary
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.10.0.0/20"
}

resource "google_compute_subnetwork" "subnet_eu" {
  name          = "talos-subnet-eu"
  region        = var.region_secondary
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.20.0.0/20"
}

# GKE Cluster US
resource "google_container_cluster" "primary" {
  name     = "talos-cluster-us"
  location = var.region_primary
  
  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1
  
  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet_us.id

  deletion_protection = false # For easier cleanup during dev

  depends_on = [google_project_service.services]
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "talos-node-pool-us"
  location   = var.region_primary
  cluster    = google_container_cluster.primary.name
  node_count = 1

  node_config {
    preemptible  = true
    machine_type = "e2-medium"

    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    service_account = google_service_account.gke_sa.email
    oauth_scopes    = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}

# GKE Cluster EU
resource "google_container_cluster" "secondary" {
  provider = google.europe
  name     = "talos-cluster-eu"
  location = var.region_secondary
  
  remove_default_node_pool = true
  initial_node_count       = 1
  
  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet_eu.id

  deletion_protection = false 

  depends_on = [google_project_service.services]
}

resource "google_container_node_pool" "secondary_nodes" {
  provider   = google.europe
  name       = "talos-node-pool-eu"
  location   = var.region_secondary
  cluster    = google_container_cluster.secondary.name
  node_count = 1

  node_config {
    preemptible  = true
    machine_type = "e2-medium"

    service_account = google_service_account.gke_sa.email
    oauth_scopes    = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}

# Service Account for Nodes
resource "google_service_account" "gke_sa" {
  account_id   = "talos-gke-sa"
  display_name = "Talosopolis GKE Service Account"
}

# Firestore Database (Native mode)
resource "google_firestore_database" "database" {
  name        = "(default)"
  location_id = "nam5" # Multi-region US
  type        = "FIRESTORE_NATIVE"
  
  depends_on = [google_project_service.services]
}
