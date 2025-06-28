from django.db import models
from django.utils import timezone

class Product(models.Model):
    name = models.CharField(max_length=30)
    rate = models.IntegerField()

class Session(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True,blank=True)# ← allow NULL for now
    begin_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True,blank=True)

class Payment(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    name = models.CharField(max_length=30)
    amount = models.IntegerField()
    time = models.DateTimeField()
