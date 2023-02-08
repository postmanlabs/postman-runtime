#!/bin/sh
set -ex

### Generating JWT private & public keys for tests ###

### RSA Key without passphrase ###

# Create a RSA private key
openssl genpkey -out rsa.private.pem -algorithm RSA -pkeyopt rsa_keygen_bits:4096

# Create a RSA public key from private key generated above
openssl pkey -pubout -inform pem -outform pem -in rsa.private.pem -out rsa.public.pem


### ECDSA Key without passphrase - EC256###

# Create a EC256 private key
openssl ecparam -name P-256 -genkey -out ecdsa256.private.temp.pem

# Convert EC256 private key into pkcs8 fromat
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in ecdsa256.private.temp.pem -out ecdsa256.private.pem

# Create a EC256 public key
openssl ec -in ecdsa256.private.temp.pem -pubout > ecdsa256.public.pem

# Delete the EC256 private key other than pkcs8
rm ecdsa256.private.temp.pem

### ECDSA Key without passphrase - EC384###

# Create a EC384 private key
openssl ecparam -name P-384 -genkey -out ecdsa384.private.temp.pem

# Convert EC384 private key into pkcs8 fromat
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in ecdsa384.private.temp.pem -out ecdsa384.private.pem

# Create a EC384 public key
openssl ec -in ecdsa384.private.temp.pem -pubout > ecdsa384.public.pem

# Delete the EC384 private key other than pkcs8
rm ecdsa384.private.temp.pem

### ECDSA Key without passphrase - EC512###

# Create a EC512 private key
openssl ecparam -name P-521 -genkey -out ecdsa512.private.temp.pem

# Convert EC512 private key into pkcs8 fromat
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in ecdsa512.private.temp.pem -out ecdsa512.private.pem

# Create a EC512 public key
openssl ec -in ecdsa512.private.temp.pem -pubout > ecdsa512.public.pem

# Delete the EC512 private key other than pkcs8
rm ecdsa512.private.temp.pem
