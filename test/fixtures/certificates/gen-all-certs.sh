#!/bin/sh
set -ex
# fixes:
# Error: error:140AB18F:SSL routines:SSL_CTX_use_certificate:ee key too small
# on Node > v10

### Generating SSL Certs for tests ###

# Create a certificate authority
openssl req -new -x509 -days 9999 -config ca.cnf -keyout ca.key -out ca.pem

# Create server private key
openssl genrsa 4096 > server-key.pem

# Create server certificate signing request
openssl req -new -nodes -sha256 -key server-key.pem -config server.cnf -out server.csr

# Create server certificate
openssl x509 -req \
  -sha256 \
  -in server.csr \
  -CA ca.pem \
  -CAkey ca.key \
  -out server-crt.pem \
  -passin 'pass:password' \
  -days 3650

# Create client private key
openssl genrsa -out client-key.pem 2048

# Create client certificate signing request
openssl req -new -sha256 -key client-key.pem -out client.csr -config client.cnf -days 1095

# Create client certificate
openssl x509 -req \
    -in client.csr \
    -CA ca.pem \
    -CAkey ca.key \
    -passin 'pass:password' \
    -out client-crt.pem \
    -days 1095

# Create client PKCS12 certificate without password
openssl pkcs12 -export \
    -inkey client-key.pem \
    -in client-crt.pem \
    -out client-pkcs12.pfx \
    -passout 'pass:'

# Create client PKCS12 certificate with password
openssl pkcs12 -export \
    -inkey client-key.pem \
    -in client-crt.pem \
    -out client-pkcs12-passphrase.pfx \
    -passout 'pass:password'
