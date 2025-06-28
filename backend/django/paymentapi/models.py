from django.db import models
from django.utils import timezone

class Product(models.Model):
    name = models.CharField(max_length=30)
    rate = models.IntegerField()

    def __str__(self):
        return self.name + " at rate: " + str(self.rate)

class Session(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True,blank=True)# ← allow NULL for now
    begin_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True,blank=True)

class Payment(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    name = models.CharField(max_length=30)
    amount = models.IntegerField()
    time = models.DateTimeField()
  
class Grant(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, null=True,blank=True)# ← allow NULL for now
    token = models.CharField(max_length=30,null=True,blank=True)
    hash_url = models.CharField(max_length=30,null=True,blank=True)
    continue_uri = models.CharField(max_length=30)
    continue_access = models.CharField(max_length=30)
    quote_id = models.CharField(max_length=30)
    incomming_payment_id = models.CharField(max_length=30)
    debit_amount = models.JSONField()
    manage_url = models.CharField(max_length=30)

