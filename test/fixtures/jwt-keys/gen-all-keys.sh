#!/bin/sh
set -ex

### Generating JWT private & public keys for tests ###

### RSA Key without passphrase ###

# Create a RSA private key
ssh-keygen -t rsa -b 4096 -m PEM -f rsa.private.pem -N ""

# Create a RSA public key from private key generated above
openssl rsa -in rsa.private.pem -pubout -outform PEM -out rsa.public.pem

# Delete the rsa.private.pem.pub file
rm rsa.private.pem.pub


### RSA Key with passphrase ###

# Create a RSA private key with passphrase
ssh-keygen -t rsa -b 4096 -m PEM -f rsa-passphrase.private.pem -N "test1234key"

# Create a RSA public key from private key generated above
openssl rsa -in rsa-passphrase.private.pem -pubout -outform PEM -out rsa-passphrase.public.pem -passin pass:test1234key

# Delete the rsa-passphrase.private.pem.pub file
rm rsa-passphrase.private.pem.pub


### ECDSA Key without passphrase ###

# Create a EC private key
openssl ecparam -name secp256k1 -genkey -out ecdsa.private.pem

# Create a EC public key
openssl ec -in ecdsa.private.pem -pubout > ecdsa.public.pem


### ECDSA Key with passphrase ###
# Create a EC private key
openssl ec -in ecdsa.private.pem -out ecdsa-passphrase.private.pem -aes256 -passout pass:12345678

# Create a EC public key
openssl ec -in ecdsa-passphrase.private.pem -pubout > ecdsa-passphrase.public.pem -passin pass:12345678
