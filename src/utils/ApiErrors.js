
class ApiError extends Error {
  constructor(
    message = "An error occurred", 
    statusCode,
    errors = [],
    stack = ''


) {
    super();
    this.statusCode = statusCode;
    this.errors = errors;
    this.stack = stack;
    this.data = null;
    this.success = false;
    this.message = message;

    if(stack){
        this.stack = stack;
    }else{
        Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;