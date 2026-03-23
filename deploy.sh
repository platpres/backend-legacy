#!/bin/bash

rm platpres-backend.tar.bz2
tar jcvf platpres-backend.tar.bz2 dist
scp -i /Users/jdelgado/Downloads/platpres-v2.pem platpres-backend.tar.bz2 ec2-user@ec2-54-167-93-146.compute-1.amazonaws.com:/tmp/
