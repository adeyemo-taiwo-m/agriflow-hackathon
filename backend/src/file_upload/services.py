from src.config import Config
from fastapi import UploadFile, HTTPException, status
import cloudinary
from cloudinary.uploader import upload
import asyncio
import magic
from enum import Enum
import uuid

class ImageCategory(str, Enum):
    DISPLAY_PHOTO = "display_photo"
    LOCATION_PHOTO = "location_photo"
    MILESTONE_PHOTO = "milestone_photo"
    PAYMENT_PHOTO = "payment_photo"
    

max_display_photo_upload_bytes = 5 
max_location_photo_upload_bytes = 3 
max_milestone_photo_upload_bytes = 3 
max_payment_photo_upload_bytes = 3 



cloudinary.config(
    cloud_name=Config.CLOUDINARY_CLOUD_NAME,
    api_key= Config.CLOUDINARY_API_KEY,
    api_secret= Config.CLOUDINARY_API_SECRET
)

class FileUploadServices:

    #allows only images pass
    def validate_file(self, file: UploadFile, image_category: ImageCategory):

        if image_category == ImageCategory.DISPLAY_PHOTO:
            max_upload_bytes = max_display_photo_upload_bytes
        elif image_category == ImageCategory.LOCATION_PHOTO:
            max_upload_bytes = max_location_photo_upload_bytes
        elif image_category == ImageCategory.MILESTONE_PHOTO:
            max_upload_bytes = max_milestone_photo_upload_bytes
        elif image_category == ImageCategory.PAYMENT_PHOTO:
            max_upload_bytes = max_payment_photo_upload_bytes
       

        header_data = file.file.read(2048)

        file.file.seek(0)

        mime_detector = magic.Magic(mime=True)

        real_content_type = mime_detector.from_buffer(header_data)

        allowed_types = ["image/jpeg","image/jpg","image/png","image/webp"]

        if real_content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid file type, only Jpeg,png,webp,jpg allowed"
            )
        
        file.file.seek(0,2)

        file_size = file.file.tell()

        file.file.seek(0)

        if file_size > (max_upload_bytes * 1024 * 1024):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"file greater than max size{max_upload_bytes}"
            )
        
    async def upload_image(self, file: UploadFile, farm_id: uuid.UUID,  image_category: ImageCategory):
        self.validate_file(file, image_category)
        
        file_path = "Agriflow/Misc"
        
        if image_category == ImageCategory.DISPLAY_PHOTO:
            file_path = f"Agriflow/display-photo/{farm_id}"
        elif image_category == ImageCategory.LOCATION_PHOTO:
            file_path = f"Agriflow/location-photo/{farm_id}"
        elif image_category == ImageCategory.MILESTONE_PHOTO:
            file_path = f"Agriflow/milestone-photo/{farm_id}"
        elif image_category == ImageCategory.PAYMENT_PHOTO:
            file_path = f"Agriflow/payment-photo/{farm_id}"
    

        try:
            response = await asyncio.to_thread(
                upload,
                file.file,
                folder=file_path,
                resource_type="auto" 
            )

            return {
                "public_id": response['public_id'],
                "url": response['secure_url']
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Cloudinary upload failed: {str(e)}"
            )
        
