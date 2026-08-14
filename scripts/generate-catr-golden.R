# Recreate the checked-in CAT reference vectors with CRAN catR.
# install.packages("catR", repos = "https://cloud.r-project.org")
library(catR)
library(jsonlite)

grid <- seq(-4, 4, by = 0.05)

estimate <- function(difficulties, answers) {
  items <- cbind(a = 1, b = difficulties, c = 0, d = 1)
  probabilities <- sapply(grid, function(theta) Pi(theta, items, D = 1)$Pi)
  log_likelihood <- sapply(seq_along(grid), function(index) {
    p <- pmin(1 - 1e-12, pmax(1e-12, probabilities[, index]))
    sum(ifelse(answers, log(p), log(1 - p))) - 0.5 * grid[index]^2
  })
  weights <- exp(log_likelihood - max(log_likelihood))
  weights <- weights / sum(weights)
  theta <- sum(weights * grid)
  standard_error <- sqrt(sum(weights * (grid - theta)^2))
  list(theta = theta, standardError = standard_error, grade = max(0, min(100, round(50 + 10 * theta))))
}

vectors <- list(
  list(name = "five correct", difficulties = c(-2,-1,0,1,2), answers = rep(TRUE, 5)),
  list(name = "five incorrect", difficulties = c(-2,-1,0,1,2), answers = rep(FALSE, 5)),
  list(name = "mixed", difficulties = c(-2,-1,0,1,2), answers = c(TRUE,FALSE,TRUE,FALSE,TRUE)),
  list(name = "extreme correct", difficulties = rep(c(-2,-1,0,1,2), 4), answers = rep(TRUE, 20)),
  list(name = "topic balanced", difficulties = rep(c(-1,0,1,-2,2), each = 4), answers = rep(c(TRUE,FALSE), 10))
)

output <- lapply(vectors, function(vector) c(vector, estimate(vector$difficulties, vector$answers)))
write_json(list(source = paste("catR", packageVersion("catR")), vectors = output), "src/lib/catr-golden.generated.json", pretty = TRUE, auto_unbox = TRUE)
